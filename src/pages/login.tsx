export const getServerSideProps = () => ({
  redirect: { destination: "/sign-in", permanent: false },
});

export default function LegacyLogin() { return null; }
