"use client";

import React, { useEffect, useState } from "react";
import Script from "next/script";
import { Analytics } from "@vercel/analytics/next";
import {
  isAutomatedOrInternalSession,
  detectAiSearchReferral,
  trackAiReferralIfPresent,
} from "@/lib/analytics";

export default function AnalyticsProvider({
  gaId,
  clarityId,
}: {
  gaId?: string;
  clarityId?: string;
}) {
  const [allowTracking, setAllowTracking] = useState(false);

  useEffect(() => {
    if (!isAutomatedOrInternalSession()) {
      setAllowTracking(true);
      trackAiReferralIfPresent();
    }
    const aiMatch = detectAiSearchReferral();
    if (aiMatch && typeof document !== "undefined") {
      document.documentElement.dataset.aiReferral = `${aiMatch.platformId}:${aiMatch.productId}`;
    }
  }, []);

  if (!allowTracking) return null;

  return (
    <>
      <Analytics
        beforeSend={(event) => {
          if (isAutomatedOrInternalSession()) return null;
          return event;
        }}
      />
      {gaId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
            strategy="lazyOnload"
          />
          <Script id="ga4-init" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${gaId}');`}
          </Script>
        </>
      )}
      {clarityId && (
        <Script id="clarity-init" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${clarityId}");`}
        </Script>
      )}
    </>
  );
}
