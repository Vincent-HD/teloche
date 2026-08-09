{
  description = "Teloche IPTV client and backend development shell";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [
        "x86_64-linux"
        "aarch64-linux"
        "x86_64-darwin"
        "aarch64-darwin"
      ];

      forAllSystems = f:
        nixpkgs.lib.genAttrs systems (system:
          f {
            inherit system;
            pkgs = import nixpkgs {
              inherit system;
            };
          });
    in
    {
      devShells = forAllSystems ({ system, pkgs }: {
        default = pkgs.mkShell {
          packages = [
            pkgs.nodejs_24
            (import ./nub.nix { inherit pkgs system; })
            pkgs.jdk17
            pkgs.android-tools
            pkgs.git
            pkgs.jq
          ];

          shellHook = ''
            echo "teloche dev shell"
            echo "node: $(node --version)"
            echo "nub: $(nub --version)"
            echo "java: $(java -version 2>&1 | head -n 1)"
            echo "adb: $(adb version | head -n 1 || true)"
            echo "project state: discovery retained; application implementation reset"
            echo "next step: agree on the Xtream source boundary before adding code"
          '';
        };
      });
    };
}
