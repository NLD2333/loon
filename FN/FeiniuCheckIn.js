/**
 * FNOS (飞牛) 论坛自动签到 Loon 脚本
 */

const cookieKey = 'Feiniu_Cookie';
const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/142.0.0.0 Safari/537.36",
    "Referer": "https://club.fnnas.com/portal.php"
};

if (typeof $request !== "undefined") {
    // 获取 Cookie 逻辑
    const cookie = $request.headers['Cookie'] || $request.headers['cookie'];
    if (cookie && cookie !== $persistentStore.read(cookieKey)) {
        if ($persistentStore.write(cookie, cookieKey)) {
            $notification.post("FNOS 论坛", "获取 Cookie 成功 🎉", "请返回 Loon 配置中关闭获取开关");
        }
    }
    $done({});
} else {
    // 签到逻辑
    const cookie = $persistentStore.read(cookieKey);
    if (!cookie) {
        finish("❌ 签到失败", "未获取到 Cookie，请开启开关并在浏览器登录");
    } else {
        headers["Cookie"] = cookie;
        doCheckIn();
    }
}

function doCheckIn() {
    const signUrl = "https://club.fnnas.com/plugin.php?id=zqlj_sign";
    
    $httpClient.get({ url: signUrl, headers }, (err, resp, data) => {
        if (err || !data) return finish("❌ 获取签到页失败", err);

        if (data.includes("今日已打卡")) return fetchInfo("✅ 今日已签到");

        const match = data.match(/&sign=([0-9a-fA-F]+)" class="btna">点击打卡/);
        if (!match) return finish("⚠️ 签到异常", "未能找到打卡按钮或 Cookie 已失效");

        $httpClient.get({ url: `${signUrl}&sign=${match[1]}`, headers }, (e, r, b) => {
            if (e) return finish("❌ 签到请求失败", e);
            const title = b.includes("打卡成功") ? "✅ 签到成功！" : "⚠️ 签到结果未知";
            fetchInfo(title);
        });
    });
}

function fetchInfo(title) {
    $httpClient.get({ url: "https://club.fnnas.com/plugin.php?id=zqlj_sign", headers }, (err, resp, html) => {
        let detail = "";
        if (!err && html) {
            const match = html.match(/<strong>\s*我的打卡动态\s*<\/strong>[\s\S]*?<div[^>]*class="bm_c"[^>]*>([\s\S]*?)<\/div>/);
            if (match) {
                // 剔除 HTML 标签并格式化输出
                let text = match[1].replace(/<\/li\s*>/g, "\n").replace(/<[^>]+>/g, "").replace("我的打卡动态", "").trim();
                detail = text.split('\n').reduce((acc, line) => {
                    let sep = line.includes("：") ? "：" : (line.includes(":") ? ":" : "");
                    if (sep) {
                        let parts = line.split(sep);
                        acc.push(`📊 ${parts[0].trim()}: ${parts.slice(1).join(sep).trim()}`);
                    }
                    return acc;
                }, []).join("\n");
            }
        }
        finish(title, detail || "未能获取打卡动态详情");
    });
}

function finish(title, detail) {
    console.log(`[FNOS 论坛]\n${title}\n${detail}`);
    $notification.post("FNOS 论坛", title, detail);
    $done();
}
