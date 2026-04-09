import AuthCard from "../components/auth/AuthCard";
import AuthLayout from "../layouts/AuthLayout";

type AuthPageMode = "welcome" | "login" | "register";

type AuthPageProps = {
  mode: AuthPageMode;
};

function AuthPage({ mode }: AuthPageProps) {
  return (
    <AuthLayout>
      <AuthCard mode={mode} />
    </AuthLayout>
  );
}

export default AuthPage;
