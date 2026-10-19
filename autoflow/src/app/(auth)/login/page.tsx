import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Autentificare" };

export default function LoginPage() {
  return (
    <>
      <h1 className="text-[24px] font-semibold tracking-tight">Autentificare</h1>
      <p className="mt-1.5 text-fg-2">Intrați în contul parcului auto.</p>
      <LoginForm />
      <p className="mt-6 text-center text-[13px] text-fg-2">
        Nu aveți cont?{" "}
        <Link href="/register" className="font-medium text-accent hover:underline">
          Înregistrați parcul auto
        </Link>
      </p>
    </>
  );
}
