{
  description = "LangWars — shared-state LWLang programming arena";

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
      npmDepsHash = "sha256-4+BVAff192ZJ49Kq92lf12SicTh8jG/Ns0a7y9pIL4c=";

      frontendSrc = nixpkgs.lib.cleanSourceWith {
        src = ./frontend;
        filter =
          path: type:
          let
            base = baseNameOf (toString path);
          in
          !(builtins.elem base [
            "node_modules"
            ".npm-cache"
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
            name = "langwars";
            packages = [ pkgs.nodejs_22 pkgs.python313 pkgs.postgresql_17 ];

            shellHook = ''
              echo "LangWars dev shell — Node $(node --version), Python $(python --version)"
              echo "cwd: $PWD"
              echo "Frontend: npm --prefix frontend ci; npm --prefix frontend run dev"
              echo "Server setup and worker commands: see README.md"
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
