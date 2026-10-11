import http from "node:http";

const PORT = process.env.PORT || 10000;

const server = http.createServer((req, res) => {
res.setHeader("Content-Type", "application/json");

if (req.url === "/health" && req.method === "GET") {
res.writeHead(200);
res.end(JSON.stringify({
status: "ok",
service: "NLS Stripe Backend"
}));
return;
}

res.writeHead(404);
res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
console.log(`NLS backend running on port ${PORT}`);
});
