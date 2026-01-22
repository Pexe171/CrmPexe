declare namespace bcryptjs {
  function genSalt(rounds?: number): Promise<string>;
  function genSaltSync(rounds?: number): string;
  function hash(data: string, saltOrRounds: string | number): Promise<string>;
  function hashSync(data: string, saltOrRounds: string | number): string;
  function compare(data: string, encrypted: string): Promise<boolean>;
  function compareSync(data: string, encrypted: string): boolean;
}

declare const bcrypt: typeof bcryptjs;

export = bcrypt;
