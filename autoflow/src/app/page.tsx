import { redirect } from "next/navigation";
import { getCurrentContext } from "@/server/auth/session";

export default async function Home() {
  redirect((await getCurrentContext()) ? "/dashboard" : "/login");
}
