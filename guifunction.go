package main

import (
	"encoding/json"
	"errors"
	"path/filepath"
	"strings"

	"based-app/db"
	"based-app/process"
	"based-app/settings"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	"go.uber.org/zap"
)

// Pair, data types reused from previous implementation
type Pair struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

type LocalLibraryData struct {
	LibraryData []LibraryTemplateData `json:"library_data"`
	Issues      []Pair                `json:"issues"`
	NumFiles    int                   `json:"num_files"`
}

type SwitchTitle struct {
	Name        string `json:"name"`
	TitleId     string `json:"titleId"`
	Icon        string `json:"icon"`
	Region      string `json:"region"`
	ReleaseDate string `json:"release_date"`
}

type LibraryTemplateData struct {
	Id      int    `json:"id"`
	Name    string `json:"name"`
	Version string `json:"version"`
	Dlc     string `json:"dlc"`
	TitleId string `json:"titleId"`
	Path    string `json:"path"`
	Icon    string `json:"icon"`
	Update  int    `json:"update"`
	Region  string `json:"region"`
	Type    string `json:"type"`
}

type ProgressUpdate struct {
	Curr    int    `json:"curr"`
	Total   int    `json:"total"`
	Message string `json:"message"`
}

// helper to determine file type
func getType(gameFile *db.SwitchGameFiles) string {
	if gameFile.IsSplit {
		return "split"
	}
	if gameFile.MultiContent {
		return "multi-content"
	}
	ext := filepath.Ext(gameFile.File.ExtendedInfo.FileName)
	if len(ext) > 1 {
		return ext[1:]
	}
	return ""
}

// UpdateProgress emits a progress update event to the frontend.
func (a *App) UpdateProgress(curr int, total int, message string) {
	progressMessage := ProgressUpdate{Curr: curr, Total: total, Message: message}
	if a.sugarLogger != nil {
		a.sugarLogger.Debugf("%v (%v/%v)", message, curr, total)
	}
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "updateProgress", progressMessage)
	}
}

// SaveSettings saves settings from frontend JSON.
func (a *App) SaveSettings(settingsJson string) error {
	s := settings.AppSettings{}
	err := json.Unmarshal([]byte(settingsJson), &s)
	if err != nil {
		return err
	}
	settings.SaveSettings(&s, a.baseFolder)
	return nil
}

// LoadSettings returns settings as JSON.
func (a *App) LoadSettings() string {
	return settings.ReadSettingsAsJSON(a.baseFolder)
}

// GetMissingDLC returns JSON list of missing DLC entries.
func (a *App) GetMissingDLC() string {
	settingsObj := settings.ReadSettings(a.baseFolder)
	ignoreIds := map[string]struct{}{}
	for _, id := range settingsObj.IgnoreDLCTitleIds {
		ignoreIds[strings.ToLower(id)] = struct{}{}
	}
	missingDLC := process.ScanForMissingDLC(a.localDB.TitlesMap, a.switchDB.TitlesMap, ignoreIds)
	values := make([]process.IncompleteTitle, len(missingDLC))
	i := 0
	for _, missingUpdate := range missingDLC {
		values[i] = missingUpdate
		i++
	}

	msg, _ := json.Marshal(values)
	return string(msg)
}

// GetMissingUpdates returns JSON list of missing updates.
func (a *App) GetMissingUpdates() string {
	settingsObj := settings.ReadSettings(a.baseFolder)
	ignoreIds := map[string]struct{}{}
	for _, id := range settingsObj.IgnoreUpdateTitleIds {
		ignoreIds[strings.ToLower(id)] = struct{}{}
	}
	missingUpdates := process.ScanForMissingUpdates(a.localDB.TitlesMap, a.switchDB.TitlesMap, ignoreIds, settingsObj.IgnoreDLCUpdates)
	values := make([]process.IncompleteTitle, len(missingUpdates))
	i := 0
	for _, missingUpdate := range missingUpdates {
		values[i] = missingUpdate
		i++
	}

	msg, _ := json.Marshal(values)
	return string(msg)
}

// buildSwitchDb downloads and processes titles/versions and builds the switch DB.
func (a *App) buildSwitchDb() (*db.SwitchTitlesDB, error) {
	settingsObj := settings.ReadSettings(a.baseFolder)
	a.UpdateProgress(1, 4, "Downloading titles.json")
	filename := filepath.Join(a.baseFolder, settings.TITLE_JSON_FILENAME)
	titleFile, titlesEtag, err := db.LoadAndUpdateFile(settingsObj.TitlesJsonUrl, filename, settingsObj.TitlesEtag)
	if err != nil {
		return nil, errors.New("failed to download switch titles [reason:" + err.Error() + "]")
	}
	settingsObj.TitlesEtag = titlesEtag

	a.UpdateProgress(2, 4, "Downloading versions.json")
	filename = filepath.Join(a.baseFolder, settings.VERSIONS_JSON_FILENAME)
	versionsFile, versionsEtag, err := db.LoadAndUpdateFile(settingsObj.VersionsJsonUrl, filename, settingsObj.VersionsEtag)
	if err != nil {
		return nil, errors.New("failed to download switch updates [reason:" + err.Error() + "]")
	}
	settingsObj.VersionsEtag = versionsEtag

	settings.SaveSettings(settingsObj, a.baseFolder)

	a.UpdateProgress(3, 4, "Processing switch titles and updates ...")
	switchTitleDB, err := db.CreateSwitchTitleDB(titleFile, versionsFile)
	a.UpdateProgress(4, 4, "Finishing up...")
	return switchTitleDB, err
}

// buildLocalDB scans folders for local switch files and returns the local DB.
func (a *App) buildLocalDB(ignoreCache bool) (*db.LocalSwitchFilesDB, error) {
	folderToScan := settings.ReadSettings(a.baseFolder).Folder
	recursiveMode := settings.ReadSettings(a.baseFolder).ScanRecursively

	scanFolders := settings.ReadSettings(a.baseFolder).ScanFolders
	scanFolders = append(scanFolders, folderToScan)
	localDB, err := a.localDbManager.CreateLocalSwitchFilesDB(scanFolders, a, recursiveMode, ignoreCache)
	a.localDB = localDB
	return localDB, err
}

// OrganizeLibrary performs the organize operation.
func (a *App) OrganizeLibrary() {
	folderToScan := settings.ReadSettings(a.baseFolder).Folder
	options := settings.ReadSettings(a.baseFolder).OrganizeOptions
	if !process.IsOptionsValid(options) {
		zap.S().Error("the organize options in settings.json are not valid, please check that the template contains file/folder name")
		if a.ctx != nil {
			runtime.EventsEmit(a.ctx, "error", "the organize options in settings.json are not valid, please check that the template contains file/folder name")
		}
		return
	}
	if settings.ReadSettings(a.baseFolder).OrganizeOptions.DeleteOldUpdateFiles {
		process.DeleteOldUpdates(a.baseFolder, a.localDB, a)
	}
	process.OrganizeByFolders(folderToScan, a.localDB, a.switchDB, a)
}

// UpdateLocalLibrary builds the local DB and returns the library data as JSON.
func (a *App) UpdateLocalLibrary(ignoreCache bool) string {
	localDB, err := a.buildLocalDB(ignoreCache)
	if err != nil {
		if a.sugarLogger != nil {
			a.sugarLogger.Error(err)
		}
		if a.ctx != nil {
			runtime.EventsEmit(a.ctx, "error", err.Error())
		}
		return ""
	}
	response := LocalLibraryData{}
	libraryData := []LibraryTemplateData{}
	issues := []Pair{}
	for k, v := range localDB.TitlesMap {
		if v.BaseExist {
			version := ""
			name := ""
			if v.File.Metadata.Ncap != nil {
				version = v.File.Metadata.Ncap.DisplayVersion
				if t, ok := v.File.Metadata.Ncap.TitleName["AmericanEnglish"]; ok {
					name = t.Title
				}
			}

			if len(v.Updates) != 0 {
				if v.Updates[v.LatestUpdate].Metadata.Ncap != nil {
					version = v.Updates[v.LatestUpdate].Metadata.Ncap.DisplayVersion
				} else {
					version = ""
				}
			}
			if title, ok := a.switchDB.TitlesMap[k]; ok {
				if title.Attributes.Name != "" {
					name = title.Attributes.Name
				}
				libraryData = append(libraryData,
					LibraryTemplateData{
						Icon:    title.Attributes.IconUrl,
						Name:    name,
						TitleId: title.Attributes.Id,
						Update:  v.LatestUpdate,
						Version: version,
						Region:  title.Attributes.Region,
						Type:    getType(v),
						Path:    filepath.Join(v.File.ExtendedInfo.BaseFolder, v.File.ExtendedInfo.FileName),
					})
			} else {
				if name == "" {
					name = db.ParseTitleNameFromFileName(v.File.ExtendedInfo.FileName)
				}
				libraryData = append(libraryData,
					LibraryTemplateData{
						Name:    name,
						Update:  v.LatestUpdate,
						Version: version,
						Type:    getType(v),
						TitleId: v.File.Metadata.TitleId,
						Path:    v.File.ExtendedInfo.FileName,
					})
			}

		} else {
			for _, update := range v.Updates {
				issues = append(issues, Pair{Key: filepath.Join(update.ExtendedInfo.BaseFolder, update.ExtendedInfo.FileName), Value: "base file is missing"})
			}
			for _, dlc := range v.Dlc {
				issues = append(issues, Pair{Key: filepath.Join(dlc.ExtendedInfo.BaseFolder, dlc.ExtendedInfo.FileName), Value: "base file is missing"})
			}
		}
	}
	for k, v := range localDB.Skipped {
		issues = append(issues, Pair{Key: filepath.Join(k.BaseFolder, k.FileName), Value: v.ReasonText})
	}

	response.LibraryData = libraryData
	response.NumFiles = localDB.NumFiles
	response.Issues = issues
	msg, _ := json.Marshal(response)
	if a.ctx != nil {
		runtime.EventsEmit(a.ctx, "libraryLoaded", string(msg))
	}
	return string(msg)
}

// UpdateDB ensures the switch DB is loaded.
func (a *App) UpdateDB() error {
	if a.switchDB == nil {
		switchDb, err := a.buildSwitchDb()
		if err != nil {
			if a.sugarLogger != nil {
				a.sugarLogger.Error(err)
			}
			if a.ctx != nil {
				runtime.EventsEmit(a.ctx, "error", err.Error())
			}
			return err
		}
		a.switchDB = switchDb
	}
	return nil
}

// GetMissingGames returns a slice of SwitchTitle for missing games compared to local DB.
func (a *App) GetMissingGames() ([]SwitchTitle, error) {
	var result []SwitchTitle
	for k, v := range a.switchDB.TitlesMap {
		if _, ok := a.localDB.TitlesMap[k]; ok {
			continue
		}
		if v.Attributes.Name == "" || v.Attributes.Id == "" {
			continue
		}

		options := settings.ReadSettings(a.baseFolder)
		if options.HideDemoGames && v.Attributes.IsDemo {
			continue
		}

		result = append(result, SwitchTitle{
			TitleId:     v.Attributes.Id,
			Name:        v.Attributes.Name,
			Icon:        v.Attributes.BannerUrl,
			Region:      v.Attributes.Region,
			ReleaseDate: v.Attributes.ParsedReleaseDate,
		})
	}
	return result, nil
}
