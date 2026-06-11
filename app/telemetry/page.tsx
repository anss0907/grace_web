"use client";

import { useState, useRef, useEffect } from "react";

interface ChatMessage {
    id: string;
    role: "user" | "grace";
    text: string;
    timestamp: Date;
}

export default function TalkToGracePage() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [isThinking, setIsThinking] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [ttsEnabled, setTtsEnabled] = useState(true);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    const chatContainerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll chat container only (not the page)
    useEffect(() => {
        const el = chatContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
    }, [messages, isThinking]);

    // Initial greeting
    useEffect(() => {
        const timer = setTimeout(() => {
            setMessages([
                {
                    id: "welcome",
                    role: "grace",
                    text: "Hello! I'm GRACE, your friendly nursing companion. 💜 How can I help you today?",
                    timestamp: new Date(),
                },
            ]);
        }, 600);
        return () => clearTimeout(timer);
    }, []);

    function speakText(text: string) {
        if (!ttsEnabled || !("speechSynthesis" in window)) return;
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();

        // Strip emojis so TTS doesn't read them aloud ("smiling face with hearts")
        const cleanText = text.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
            const bestVoice = voices.find(
                (v) =>
                    v.name.includes("Female") ||
                    v.name.includes("female") ||
                    v.lang === "en-GB"
            );
            if (bestVoice) utterance.voice = bestVoice;
        }
        utterance.pitch = 1.2;
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
    }

    async function sendMessage(text: string) {
        if (!text.trim() || isThinking) return;

        const userMsg: ChatMessage = {
            id: `user-${Date.now()}`,
            role: "user",
            text: text.trim(),
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsThinking(true);

        try {
            // Build message history for API
            const apiMessages = [
                ...messages
                    .filter((m) => m.id !== "welcome")
                    .map((m) => ({
                        role: m.role === "user" ? "user" : "model",
                        text: m.text,
                    })),
                { role: "user", text: text.trim() },
            ];

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: apiMessages }),
            });

            const data = await res.json();

            if (data.error) {
                throw new Error(data.error);
            }

            const graceMsg: ChatMessage = {
                id: `grace-${Date.now()}`,
                role: "grace",
                text: data.reply,
                timestamp: new Date(),
            };

            setMessages((prev) => [...prev, graceMsg]);
            speakText(data.reply);
        } catch (err) {
            const errText = err instanceof Error ? err.message : "I'm having trouble connecting right now. Please try again! 🔧";
            const errorMsg: ChatMessage = {
                id: `error-${Date.now()}`,
                role: "grace",
                text: errText,
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMsg]);
            console.error("Chat error:", err);
        } finally {
            setIsThinking(false);
        }
    }

    function startSpeechToText() {
        if (
            !(
                "webkitSpeechRecognition" in window ||
                "SpeechRecognition" in window
            )
        ) {
            alert("Speech Recognition is not supported in this browser.");
            return;
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const SpeechRecognition =
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).SpeechRecognition ||
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();

        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => setIsListening(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            sendMessage(transcript);
        };

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsListening(false);
        };

        recognition.onend = () => setIsListening(false);
        recognition.start();
    }

    const formatTime = (date: Date) =>
        date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

    return (
        <>
        <style dangerouslySetInnerHTML={{ __html: '.footer { display: none !important; }' }} />
        <main
            style={{
                position: "fixed",
                top: "80px",
                left: 0,
                right: 0,
                bottom: 0,
                display: "flex",
                flexDirection: "column",
                background:
                    "linear-gradient(180deg, #0a0a12 0%, #0d0d1a 50%, #0a0f14 100%)",
                overflow: "hidden",
                zIndex: 10,
            }}
        >
            {/* Header */}
            <div
                style={{
                    textAlign: "center",
                    padding: "1rem 1rem 0.5rem",
                    flexShrink: 0,
                }}
            >
                <div
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "12px",
                        marginBottom: "4px",
                    }}
                >
                    <div
                        style={{
                            width: "44px",
                            height: "44px",
                            borderRadius: "50%",
                            background:
                                "linear-gradient(135deg, #624ec7, #34d399)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.3rem",
                            boxShadow: "0 0 30px rgba(98, 78, 199, 0.4)",
                            animation: "avatarPulse 3s ease-in-out infinite",
                        }}
                    >
                        🤖
                    </div>
                    <div>
                        <h1
                            style={{
                                fontSize: "1.5rem",
                                fontWeight: 800,
                                background:
                                    "linear-gradient(90deg, #a78bfa, #34d399)",
                                WebkitBackgroundClip: "text",
                                WebkitTextFillColor: "transparent",
                                margin: 0,
                                letterSpacing: "-0.5px",
                            }}
                        >
                            Talk to GRACE
                        </h1>
                        <p
                            style={{
                                color: "#64748b",
                                fontSize: "0.75rem",
                                margin: 0,
                            }}
                        >
                            Your AI-powered nursing companion
                        </p>
                    </div>
                    {/* TTS Toggle inline */}
                    <button
                        onClick={() => setTtsEnabled(!ttsEnabled)}
                        style={{
                            padding: "4px 12px",
                            borderRadius: "20px",
                            border: `1px solid ${ttsEnabled ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}`,
                            background: ttsEnabled
                                ? "rgba(52,211,153,0.1)"
                                : "transparent",
                            color: ttsEnabled ? "#34d399" : "#64748b",
                            fontSize: "0.7rem",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            fontWeight: 600,
                            marginLeft: "8px",
                        }}
                    >
                        {ttsEnabled ? "🔊 ON" : "🔇 OFF"}
                    </button>
                </div>
            </div>

            {/* Chat Area */}
            <div
                ref={chatContainerRef}
                style={{
                    flex: 1,
                    overflowY: "auto",
                    padding: "0 1rem 1rem",
                    maxWidth: "800px",
                    width: "100%",
                    margin: "0 auto",
                    minHeight: 0,
                }}
            >
                {messages.map((msg, i) => (
                    <div
                        key={msg.id}
                        style={{
                            display: "flex",
                            justifyContent:
                                msg.role === "user" ? "flex-end" : "flex-start",
                            marginBottom: "12px",
                            animation: `messageSlideIn 0.35s ease-out ${i === messages.length - 1 ? "0s" : "0s"} both`,
                        }}
                    >
                        {/* Grace avatar */}
                        {msg.role === "grace" && (
                            <div
                                style={{
                                    width: "36px",
                                    height: "36px",
                                    borderRadius: "50%",
                                    background:
                                        "linear-gradient(135deg, #624ec7, #34d399)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontSize: "0.95rem",
                                    marginRight: "10px",
                                    flexShrink: 0,
                                    marginTop: "4px",
                                }}
                            >
                                🤖
                            </div>
                        )}

                        <div
                            style={{
                                maxWidth: "75%",
                                padding: "12px 16px",
                                borderRadius:
                                    msg.role === "user"
                                        ? "18px 18px 4px 18px"
                                        : "18px 18px 18px 4px",
                                background:
                                    msg.role === "user"
                                        ? "linear-gradient(135deg, #624ec7, #7c3aed)"
                                        : "rgba(255,255,255,0.05)",
                                border:
                                    msg.role === "user"
                                        ? "none"
                                        : "1px solid rgba(255,255,255,0.08)",
                                color:
                                    msg.role === "user"
                                        ? "#fff"
                                        : "#e2e8f0",
                                fontSize: "0.95rem",
                                lineHeight: 1.6,
                                boxShadow:
                                    msg.role === "user"
                                        ? "0 4px 20px rgba(98, 78, 199, 0.3)"
                                        : "0 2px 10px rgba(0,0,0,0.2)",
                            }}
                        >
                            <div>{msg.text}</div>
                            <div
                                style={{
                                    fontSize: "0.65rem",
                                    opacity: 0.4,
                                    marginTop: "6px",
                                    textAlign:
                                        msg.role === "user"
                                            ? "right"
                                            : "left",
                                }}
                            >
                                {formatTime(msg.timestamp)}
                            </div>
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {isThinking && (
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            marginBottom: "12px",
                            animation: "messageSlideIn 0.35s ease-out both",
                        }}
                    >
                        <div
                            style={{
                                width: "36px",
                                height: "36px",
                                borderRadius: "50%",
                                background:
                                    "linear-gradient(135deg, #624ec7, #34d399)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "0.95rem",
                                flexShrink: 0,
                            }}
                        >
                            🤖
                        </div>
                        <div
                            style={{
                                padding: "14px 20px",
                                borderRadius: "18px 18px 18px 4px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.08)",
                                display: "flex",
                                gap: "6px",
                                alignItems: "center",
                            }}
                        >
                            <span className="typing-dot" style={{ animationDelay: "0s" }} />
                            <span className="typing-dot" style={{ animationDelay: "0.15s" }} />
                            <span className="typing-dot" style={{ animationDelay: "0.3s" }} />
                        </div>
                    </div>
                )}

                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div
                style={{
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    background: "rgba(10, 10, 18, 0.95)",
                    backdropFilter: "blur(20px)",
                    padding: "16px",
                    flexShrink: 0,
                }}
            >
                <div
                    style={{
                        maxWidth: "800px",
                        margin: "0 auto",
                        display: "flex",
                        gap: "10px",
                        alignItems: "center",
                    }}
                >
                    <button
                        onClick={startSpeechToText}
                        disabled={isListening || isThinking}
                        style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            border: "none",
                            background: isListening
                                ? "linear-gradient(135deg, #ef4444, #f97316)"
                                : "rgba(98, 78, 199, 0.15)",
                            color: isListening ? "#fff" : "#a78bfa",
                            cursor:
                                isListening || isThinking
                                    ? "not-allowed"
                                    : "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.3rem",
                            flexShrink: 0,
                            animation: isListening
                                ? "pulseGlow 1.5s infinite"
                                : "none",
                        }}
                        title="Speak to GRACE"
                    >
                        {isListening ? "🎙️" : "🎤"}
                    </button>

                    <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === "Enter" && sendMessage(input)
                        }
                        placeholder={
                            isThinking
                                ? "GRACE is thinking..."
                                : "Say something to GRACE..."
                        }
                        disabled={isThinking}
                        style={{
                            flex: 1,
                            padding: "14px 20px",
                            borderRadius: "24px",
                            border: "1px solid rgba(98, 78, 199, 0.2)",
                            backgroundColor: "rgba(255, 255, 255, 0.04)",
                            color: "#e2e8f0",
                            fontSize: "0.95rem",
                            outline: "none",
                            transition: "all 0.2s ease",
                            fontFamily: "inherit",
                        }}
                        onFocus={(e) =>
                        (e.target.style.borderColor =
                            "rgba(98, 78, 199, 0.5)")
                        }
                        onBlur={(e) =>
                        (e.target.style.borderColor =
                            "rgba(98, 78, 199, 0.2)")
                        }
                    />

                    <button
                        onClick={() => sendMessage(input)}
                        disabled={!input.trim() || isThinking}
                        style={{
                            width: "48px",
                            height: "48px",
                            borderRadius: "50%",
                            border: "none",
                            background:
                                input.trim() && !isThinking
                                    ? "linear-gradient(135deg, #624ec7, #34d399)"
                                    : "rgba(98, 78, 199, 0.15)",
                            color:
                                input.trim() && !isThinking
                                    ? "#fff"
                                    : "rgba(255,255,255,0.2)",
                            cursor:
                                input.trim() && !isThinking
                                    ? "pointer"
                                    : "not-allowed",
                            transition: "all 0.2s ease",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "1.3rem",
                            flexShrink: 0,
                            boxShadow:
                                input.trim() && !isThinking
                                    ? "0 4px 20px rgba(98, 78, 199, 0.4)"
                                    : "none",
                        }}
                        title="Send message"
                    >
                        ➤
                    </button>
                </div>
            </div>

            {/* Animations */}
            <style jsx>{`
                @keyframes messageSlideIn {
                    from {
                        opacity: 0;
                        transform: translateY(12px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes avatarPulse {
                    0%,
                    100% {
                        box-shadow: 0 0 20px rgba(98, 78, 199, 0.3);
                    }
                    50% {
                        box-shadow: 0 0 40px rgba(52, 211, 153, 0.5);
                    }
                }
                @keyframes pulseGlow {
                    0%,
                    100% {
                        box-shadow: 0 0 8px rgba(239, 68, 68, 0.4);
                    }
                    50% {
                        box-shadow: 0 0 24px rgba(239, 68, 68, 0.8);
                    }
                }
                .typing-dot {
                    width: 8px;
                    height: 8px;
                    border-radius: 50%;
                    background: #a78bfa;
                    animation: typingBounce 1.2s ease-in-out infinite;
                    display: inline-block;
                }
                @keyframes typingBounce {
                    0%,
                    60%,
                    100% {
                        transform: translateY(0);
                        opacity: 0.4;
                    }
                    30% {
                        transform: translateY(-8px);
                        opacity: 1;
                    }
                }
            `}</style>
        </main>
        </>
    );
}
