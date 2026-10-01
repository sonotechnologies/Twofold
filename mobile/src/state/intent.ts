// Remembers that the person tapped "I have an invite code" on the welcome screen,
// so after sign-up they land on "Enter code" rather than "Invite your person".
let joinWithCode = false;

export const pairingIntent = {
  setJoin(v: boolean) {
    joinWithCode = v;
  },
  get join() {
    return joinWithCode;
  },
};
