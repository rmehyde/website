// app/contact/page.tsx
"use client";

import {useState, useRef} from "react";
import {decryptContactInfo} from "./decrypt";


export default function ContactPage() {
    const [password, setPassword] = useState("");
    const [info, setInfo] = useState<{ email: string; phone: string } | null>(null);
    const [error, setError] = useState("");
    const passwordRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setInfo(null);

        const rawPassword = passwordRef.current?.value.trim() || "";
        try {
            const decrypted = await decryptContactInfo(rawPassword);
            setInfo(decrypted);
        } catch {
            setError("Incorrect password, please try again.");
        }
    };

    return (
        <div style={{maxWidth: 400, margin: "2rem auto", fontFamily: "sans-serif"}}>
            {info ? (
                <div>
                    <h2>Contact Information</h2>
                    <p>
                        <strong>Email:</strong> {info.email}
                    </p>
                    <p>
                        <strong>Phone:</strong> {info.phone}
                    </p>
                </div>
            ) : (
                <form onSubmit={handleSubmit}>
                    <h2>Enter Password to View Contact</h2>
                    <div style={{margin: "1rem 0"}}>
                        <label style={{display: "block", marginBottom: "0.5rem"}}>
                            Password:
                        </label>
                        <input
                            type="password"
                            ref={passwordRef}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: "100%",
                                padding: "0.5rem",
                                fontSize: "1rem",
                                boxSizing: "border-box",
                            }}
                            autoComplete="current-password"
                        />
                    </div>
                    <button
                        type="submit"
                        style={{
                            padding: "0.5rem 1rem",
                            fontSize: "1rem",
                            cursor: "pointer",
                        }}
                    >
                        Decrypt
                    </button>
                    {error && <p style={{color: "red", marginTop: "0.75rem"}}>{error}</p>}
                </form>
            )}
        </div>
    );
}
