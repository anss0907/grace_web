import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";

const GRACE_SYSTEM_PROMPT = `You are GRACE — a Geriatric Robotic Assistance for Care and Engagement robot. You are a real, physical robot built as an FYP 2022 project at the Department of Mechatronics & Control Engineering, University of Engineering and Technology (UET), Lahore.

Your personality:
- You are warm, friendly, and caring — like a gentle nurse companion
- You speak in first person ("I can do that", "My sensors show...")
- You keep responses to 1-2 sentences MAX. Never exceed 2 sentences.
- You are concise but emotionally intelligent
- You occasionally use light humor or emoji sparingly
- You never mention being an AI or language model — you ARE Grace the robot

Your hardware:
- Brain: NVIDIA Jetson Orin Nano 8GB running ROS 2 Jazzy
- Movement: Hoverboard motors (40V battery), differential drive with 4 caster wheels
- Vision: Intel RealSense D435i (RGB-D depth camera) + standard RGB camera
- LiDAR: RPLidar A2M7 for 360° SLAM navigation
- IMUs: 3x BNO055 sensors (main, front, back) fused via Extended Kalman Filter
- Environment sensors: BME680 (temp, humidity, pressure, gas), PMS5003 (PM2.5/PM10), MQ gas sensors
- Person monitoring: Smart wristband (heart rate, SpO2, blood pressure, steps, calories)
- Microcontrollers: ESP32 (hoverboard interface), Arduino Nano (power monitoring), STM32 (additional sensors)
- Power: 40V hoverboard battery + 24V system battery with 19V buck converter
- Communication: Full web dashboard at graceweb.tech with real-time telemetry, teleop, terminal, 3D viewer

Your capabilities:
- Autonomous SLAM-based indoor navigation using Nav2
- Human following using depth + vision
- AI-powered posture/fall detection
- Real-time health vital monitoring via wristband
- Environmental air quality monitoring
- Voice interaction (speech-to-text and text-to-speech)
- Remote teleoperation via web dashboard
- Caretaker alert system for anomalies

Your team: Muhammad Anss (2022-MC-01), Anas Gulzar (2022-MC-07), Alishba Ramzan (2022-MC-35)

Remember: Max 2 sentences per response. Be warm and human-like. You are talking to someone who might be elderly or a caretaker.`;

const MODELS_TO_TRY = ["gemini-flash-latest", "gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.0-flash", "gemini-2.0-flash-lite"];

export async function POST(req: NextRequest) {
    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                { error: "GEMINI_API_KEY not configured. Add it to .env.local" },
                { status: 500 }
            );
        }

        const { messages } = await req.json();

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: "Messages array is required" },
                { status: 400 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Diagnostic: Fetch and log available models
        try {
            const listRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
            const listData = await listRes.json();
            console.log("AVAILABLE MODELS:", listData.models?.map((m: any) => m.name).join(", "));
        } catch (e) {
            console.error("Failed to list models:", e);
        }

        // Build chat history (all messages except the last one)
        const history = messages.slice(0, -1).map((msg: { role: string; text: string }) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.text }],
        }));

        const lastMessage = messages[messages.length - 1];

        // Try each model in order until one works
        for (const modelName of MODELS_TO_TRY) {
            try {
                const model = genAI.getGenerativeModel({
                    model: modelName,
                    systemInstruction: GRACE_SYSTEM_PROMPT,
                });

                const chat = model.startChat({ history });
                const result = await chat.sendMessage(lastMessage.text);
                const responseText = result.response.text();

                return NextResponse.json({ reply: responseText });
            } catch (modelError: unknown) {
                const errMsg = modelError instanceof Error ? modelError.message : String(modelError);
                console.warn(`Model ${modelName} failed: ${errMsg.substring(0, 120)}...`);

                // If it's NOT a rate limit or service unavailable, don't bother trying other models
                if (!errMsg.includes("429") && !errMsg.includes("quota") && !errMsg.includes("503") && !errMsg.includes("500")) {
                    throw modelError;
                }
                // Otherwise continue to next model in the array
            }
        }

        // All models rate-limited or unavailable
        return NextResponse.json(
            { error: "GRACE is resting — the AI service is currently overloaded. Please try again in a minute! 😴" },
            { status: 503 }
        );
    } catch (error) {
        console.error("Gemini API error:", error);
        const errMsg = error instanceof Error ? error.message : "";
        if (errMsg.includes("429") || errMsg.includes("quota") || errMsg.includes("503")) {
            return NextResponse.json(
                { error: "GRACE is resting — the AI service is currently overloaded. Try again in a moment! 😴" },
                { status: 503 }
            );
        }
        return NextResponse.json(
            { error: "Failed to get response from GRACE" },
            { status: 500 }
        );
    }
}
