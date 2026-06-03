import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import MainScreen from "@/components/MainScreen";

export default async function Home() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get("user");

  if (!userCookie) {
    redirect("/register");
  }

  let name = "";
  let team = "";
  try {
    const parsed = JSON.parse(decodeURIComponent(userCookie.value));
    name = parsed.name ?? "";
    team = parsed.team ?? "";
  } catch {
    redirect("/register");
  }

  return <MainScreen name={name} team={team} />;
}
