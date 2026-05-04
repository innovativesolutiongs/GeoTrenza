const net = require("net");

const client = new net.Socket();

console.log("🚀 Starting Tracker Simulator...");

const TERMINAL_ID = "690106149138";


client.connect(808, "127.0.0.1", () => {

    console.log("✅ Connected to Server");
    console.log("📡 Device Attempting Connection");

    const packets = [

        /* 1 AUTHORIZATION */
        `7E0102000A${TERMINAL_ID}00044D6F6269636F6D496F54707E`,

        /* 2 HEARTBEAT */
        `7E000200000${TERMINAL_ID}0248687E`,

        /* 3 GPS */
        `7E0200002C${TERMINAL_ID}000D0000010000000003015A941F06CF58F6002600000000230619160840010400000000300119310116E102012A567E`,

        /* 4 COMMAND REPLY */
        `7E03000009${TERMINAL_ID}₀₀₀₀₂₈₆₃₇₅₇₄₂C312C31292E7E`,

        /* 5 TRANSPARENT DATA */
        `7E₀₉₀₀₀₀₀₉${TERMINAL_ID}₀₀₀₁₂₈₆₃₇₅₇₄₂C312C31297E`,

        /* 6 COMMAND */
        `7E8300000A${TERMINAL_ID}000001286375742C312C3129AC7E`,

        /* 7 DOWNLOAD */
        `7E89000012${TERMINAL_ID}0001332A4D30322C30382C3132333435363738230B7E`

    ];

    let index = 0;

    const sendPacket = () => {

        if (index >= packets.length) {

            console.log("✅ All packets sent");

            return;

        }

        const hex = packets[index];

        const packet = Buffer.from(hex, "hex");

        console.log(`📤 Sending Packet ${index + 1}:`, hex);

        client.write(packet);

        index++;

        setTimeout(sendPacket, 4000);

    };

    sendPacket();

});

client.on("data", (data) => {

    console.log("📥 Server Reply:", data.toString("hex"));

});

client.on("error", (err) => {

    console.log("❌ Socket Error:", err.message);

});

client.on("close", () => {

    console.log("🔌 Connection Closed");

});