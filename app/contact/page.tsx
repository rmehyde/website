"use client";

import {useState, useRef, useContext, useEffect} from "react";
import {ContactContext} from "@/app/contact/contactContext";
import {decryptContactInfo} from "./decrypt";

// shadcn/ui components:
import {Card, CardHeader, CardTitle, CardContent} from "@/components/ui/card";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter} from "@/components/ui/dialog";

// Lucide icons:
import {Lock, Unlock} from "lucide-react";
import clsx from "clsx";


export default function ContactPage() {
    const {contact, setContact} = useContext(ContactContext);
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [isShaking, setIsShaking] = useState(false);

    const passwordRef = useRef<HTMLInputElement>(null);

    const handleDecrypt = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        const rawPwd = passwordRef.current?.value.trim() || "";
        try {
            const decrypted = await decryptContactInfo(rawPwd);
            setContact(decrypted);
            setIsOpen(false); // close modal on success
        } catch {
            setError("Incorrect password, please try again.");
            // trigger shake:
            setIsShaking(true);
            setTimeout(() => setIsShaking(false), 500); // matches CSS animation duration
        }
    }

    return (
        <div className="flex justify-center p-8">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        Contact Info
                        {contact.email.includes("*") ? (
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" size="icon">
                                        <Lock className="h-5 w-5"/>
                                    </Button>
                                </DialogTrigger>

                                <DialogContent className={clsx("sm:max-w-[400px]")}>
                                    <div className={isShaking ? "animate-shake" : ""}>
                                        <DialogHeader>
                                            <DialogTitle>Unlock Contact Info</DialogTitle>
                                        </DialogHeader>
                                        <br/>
                                        <form onSubmit={handleDecrypt} className="space-y-4">
                                            <Input
                                                type="password"
                                                placeholder="Enter password"
                                                ref={passwordRef}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                autoComplete="current-password"
                                            />
                                            {error && <p className="text-sm text-red-600">{error}</p>}

                                            <DialogFooter>
                                                <Button type="submit">Decrypt</Button>
                                            </DialogFooter>
                                        </form>
                                    </div>
                                </DialogContent>
                            </Dialog>
                        ) : (
                            <Button variant="ghost" size="icon" disabled>
                                <Unlock className="h-5 w-5"/>
                            </Button>
                        )}
                    </CardTitle>
                </CardHeader>

                <CardContent className="space-y-2">
                    <div>
                        <span className="font-medium">Email:</span> {contact.email}
                    </div>
                    <div>
                        <span className="font-medium">Phone:</span> {contact.phone}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

