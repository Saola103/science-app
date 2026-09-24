import { redirect } from "next/navigation";

export default function FeedAppRoot() {
  redirect("/feedapp/feed");
}
