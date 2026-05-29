import { createClient } from "@/lib/supabase/client";

export function trackLinkClick(
  profileUserId: string,
  linkLabel:     string,
  linkUrl:       string,
) {
  const deviceType = /android|iphone|ipad|ipod|mobile|blackberry/i.test(navigator.userAgent)
    ? "mobile"
    : "desktop";
  const sb = createClient();
  sb.from("link_clicks").insert({
    profile_user_id: profileUserId,
    link_label:      linkLabel,
    link_url:        linkUrl,
    device_type:     deviceType,
  }).then(); // fire and forget
}
