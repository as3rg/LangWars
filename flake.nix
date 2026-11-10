{
  description = "LangWars frontend — LWLang arena (React + Vite + CodeMirror, MSW mock backend)";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs =
    { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems =
        f:
        nixpkgs.lib.genAttrs systems (
          system:
          f {
            inherit system;
            pkgs = import nixpkgs { inherit system; };
          }
        );

      frontendVersion = "0.1.0";
      npmDepsHash = "sha256-Gr8CnU0dFLwDsIRlTjCZTwl5PCH/WGiNm2c1MdcFOAM=";

      frontendSrc = nixpkgs.lib.cleanSourceWith {
        src = ./frontend;
        filter =
          path: type:
          let
            base = baseNameOf (toString path);
          in
          !(builtins.elem base [
            "node_modules"
            "dist"
            ".git"
            "result"
          ]);
      };
    in
    {
      packages = forAllSystems (
        { pkgs, ... }:
        let
          nodejs = pkgs.nodejs_22;

          common = {
            pname = "langwars-frontend";
            version = frontendVersion;
            src = frontendSrc;
            inherit nodejs npmDepsHash;
            meta = {
              description = "LangWars — neon competitive-programming arena for LWLang";
            };
          };

          frontend = pkgs.buildNpmPackage (
            common
            // {
              # Vite emits the static site into ./dist; install that as the package output.
              installPhase = ''
                runHook preInstall
                mkdir -p $out
                cp -r dist/. $out/
                runHook postInstall
              '';
            }
          );

          frontend-tests = pkgs.buildNpmPackage (
            common
            // {
              pname = "langwars-frontend-tests";
              dontNpmBuild = true;
              buildPhase = ''
                runHook preBuild
                npm run typecheck
                npm test
                runHook postBuild
              '';
              installPhase = ''
                runHook preInstall
                mkdir -p $out
                echo "typecheck + tests passed" > $out/result
                runHook postInstall
              '';
            }
          );
        in
        {
          default = frontend;
          frontend = frontend;
          tests = frontend-tests;
        }
      );

      devShells = forAllSystems (
        { pkgs, ... }:
        {
          default = pkgs.mkShell {
            name = "langwars-frontend";
            packages = [ pkgs.nodejs_22 ];

            shellHook = ''
              # Enter the app directory whether the shell was started at the repo root
              # or inside frontend/.
              if [ -d frontend ] && [ -f frontend/package.json ]; then
                cd frontend
              fi
              echo "LangWars frontend dev shell — Node $(node --version), npm $(npm --version)"
              echo "cwd: $PWD"
              echo "Commands: npm run dev | npm test | npm run build"
              if [ -f package.json ] && [ ! -d node_modules ]; then
                echo "node_modules missing — running npm ci"
                npm ci
              fi
            '';
          };
        }
      );

      checks = forAllSystems (
        { system, ... }:
        {
          build = self.packages.${system}.frontend;
          tests = self.packages.${system}.tests;
        }
      );

      formatter = forAllSystems ({ pkgs, ... }: pkgs.nixfmt);
    };
}
