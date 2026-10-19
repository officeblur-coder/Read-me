import Link from "next/link";
import { RegisterForm } from "./register-form";

export const metadata = { title: "Înregistrare" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="text-[24px] font-semibold tracking-tight">Creați contul parcului auto</h1>
      <p className="mt-1.5 text-fg-2">Veți fi proprietarul contului și puteți adăuga apoi echipa.</p>
      <RegisterForm />
      <p className="mt-6 text-center text-[13px] text-fg-2">
        Aveți deja cont?{" "}
        <Link href="/login" className="font-medium text-accent hover:underline">
          Autentificați-vă
        </Link>
      </p>
    </>
  );
}
