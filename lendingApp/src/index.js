import { createApp } from "@deroll/app";
import { getAddress, hexToString, stringToHex } from "viem";

const app = createApp({ url: process.env.ROLLUP_HTTP_SERVER_URL || "http://127.0.0.1:5004" });

let loans = {};

app.addAdvanceHandler(async ({ metadata, payload }) => {
    const sender = getAddress(metadata.msg_sender);
    const payloadString = hexToString(payload);
    console.log("Sender:", sender, "Payload:", payloadString);

    try {
        const jsonPayload = JSON.parse(payloadString);

        if (jsonPayload.method === "create_loan") {
            loans[jsonPayload.loanId] = {
                lender: sender,
                borrower: jsonPayload.borrower,
                amount: BigInt(jsonPayload.amount),
                repaid: false
            };
            console.log("Loan created:", jsonPayload.loanId);

        } else if (jsonPayload.method === "repay_loan") {
            const loan = loans[jsonPayload.loanId];
            if (loan && loan.borrower === sender) {
                loan.repaid = true;
                console.log("Loan repaid:", jsonPayload.loanId);
            } else {
                console.error("Error: Loan not found or not authorized.");
            }
        }

        return "accept";
    } catch (e) {
        console.error(e);
        app.createReport({ payload: stringToHex(String(e)) });
        return "reject";
    }
});

app.addInspectHandler(async ({ payload }) => {
    const loanId = hexToString(payload).split("/")[1];
    const loan = loans[loanId] || {};
    await app.createReport({ payload: stringToHex(JSON.stringify(loan)) });
});

app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
