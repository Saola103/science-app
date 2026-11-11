// R1-05: ルートの入力検証(DBに触れる前に400/413/401で終わること)
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as feedback } from "../../app/api/feedback/route";
import { POST as adminFeedback } from "../../app/api/admin/feedback/route";

let n = 0;
const req = (body: string, ip: string) =>
  new NextRequest("http://x/api", { method: "POST", body, headers: { "x-forwarded-for": ip + n++ } });

(async () => {
  for (const [name, h] of [["feedback", feedback], ["admin", adminFeedback]] as const) {
    assert.equal((await h(req("null", name))).status, 400, `${name} null`);
    assert.equal((await h(req("{bad", name))).status, 400, `${name} bad json`);
    assert.equal((await h(req(JSON.stringify({ message: "x".repeat(40_000) }), name))).status, 413, `${name} big`);
  }
  // 認証失敗は401(DBに触れない)
  assert.equal((await adminFeedback(req(JSON.stringify({ password: "wrong" }), "adm"))).status, 401);
  console.log("routes-input: OK");
})();
