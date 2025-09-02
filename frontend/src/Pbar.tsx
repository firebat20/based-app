import { Progress } from "@/components/ui/progress"
import * as React from "react"
import { EventsOn } from "../wailsjs/runtime"

interface ProgressUpdatePayload {
    curr: number;
    total: number;
    message: string;
}

export function Pbar() {
    const [progress, setProgress] = React.useState(0);
    const [message, setMessage] = React.useState("");
    const [visible, setVisible] = React.useState(false);

    React.useEffect(() => {
        const onProgressUpdate = (data: ProgressUpdatePayload) => {
            setVisible(true);
            setProgress((data.curr / data.total) * 100);
            setMessage(`${data.message} (${data.curr}/${data.total})`);

            if (data.curr >= data.total) {
                setTimeout(() => {
                    setVisible(false);
                }, 2000); // Hide after 2 seconds when complete
            }
        };

        // Subscribe to the 'updateProgress' event from Go
        const unsubscribe = EventsOn("updateProgress", onProgressUpdate);

        // Cleanup function to unsubscribe when the component unmounts
        return () => {
            unsubscribe();
        };
    }, []); // The empty dependency array ensures this effect runs only once on mount

    if (!visible) return null;

    return (
        <div className="fixed top-1/2 left-1/2 w-2/3 max-w-3xl -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-background/90 p-6 shadow-lg backdrop-blur-sm z-50">
            <p className="text-sm text-center mb-2">{message}</p>
            <Progress value={progress} className="w-full" />
        </div>
    );
}
