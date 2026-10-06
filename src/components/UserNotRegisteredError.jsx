import React from 'react';

const UserNotRegisteredError = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-sidebar px-5 py-4 sm:px-8">
        <img src="/koach-logo-white.png" alt="KOACH" className="h-6 w-auto" />
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <h1 className="text-[32px] leading-tight text-foreground">This account doesn't have access.</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
          You're signed in, but this account isn't registered here. Ask your coach or the account owner to add you.
        </p>
        <div className="panel mt-6 p-5">
          <p className="text-[15px] font-semibold text-foreground">If you think this is a mistake</p>
          <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
            <li>Check you're signed in with the right email.</li>
            <li>Ask your coach to send you a new invite.</li>
            <li>Sign out and sign back in.</li>
          </ul>
        </div>
      </main>
    </div>
  );
};

export default UserNotRegisteredError;
