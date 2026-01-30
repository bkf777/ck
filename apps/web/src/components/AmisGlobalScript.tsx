"use client";

import Script from "next/script";

export default function AmisGlobalScript() {
  return (
    <>
      <link rel="stylesheet" href="/amis/sdk.css" />
      <link rel="stylesheet" href="/amis/helper.css" />
      <link rel="stylesheet" href="/amis/iconfont.css" />

      <Script
        src="/amis/sdk.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log("Amis SDK loaded");
          window.dispatchEvent(new Event("amis-ready"));
        }}
        onError={(e) => {
          console.error("Failed to load Amis SDK:", e);
        }}
      />
    </>
  );
}
