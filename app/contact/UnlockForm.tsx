"use client";

import {useState, useRef} from "react";
import clsx from "clsx";

import {useContactStore} from "@/app/contact/contactContext";

// shadcn/ui components:
import {Input} from "@/components/ui/input";
import {Button} from "@/components/ui/button";

export interface UnlockFormProps {
    // Called after a passphrase successfully decrypts the contact info. The modal
    // presentation (Resume) uses this to close itself; the inline presentation
    // (Contact) can ignore it and let the global store update flip the display.
    onSuccess?: () => void;
    className?: string;
}

// Container-agnostic unlock unit: blurb + passphrase input + decrypt glue. Knows
// nothing about whether it's rendered inline or inside a Dialog — that's the caller's
// job. Decryption (decrypt.ts) and global state (contactContext.tsx) are the shared
// atoms it composes; the only seam between presentations is the onSuccess callback.
export function UnlockForm({onSuccess, className}: UnlockFormProps) {
    const unlock = useContactStore((state) => state.unlock);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isShaking, setIsShaking] = useState(false);

    const passwordRef = useRef<HTMLInputElement>(null);

    const handleDecrypt = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const rawPwd = passwordRef.current?.value.toLowerCase().replace(/\W/g, '') || "";
        if (await unlock(rawPwd)) {
            onSuccess?.();
        } else {
            setError("Incorrect passphrase, please try again.");
            // trigger shake:
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500); // matches CSS animation duration
        }
    };

    return (
        <div className={clsx(isShaking && "animate-shake", className)}>
            <div className="space-y-4">
                {/* TODO: placeholder copy — real wording + passphrase hint come in a later pass. */}
                <p className="text-sm text-muted-foreground">
                    My email and phone are hidden. Enter the passphrase to reveal them.
                </p>
                <form onSubmit={handleDecrypt} className="space-y-4">
                    <Input
                        type="text"
                        placeholder="Enter passphrase"
                        ref={passwordRef}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="current-password"
                    />
                    {error && <p className="text-sm text-red-600">{error}</p>}
                    <Button type="submit">Decrypt</Button>
                </form>
            </div>
        </div>
    );
}
