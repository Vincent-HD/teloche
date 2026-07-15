{ pkgs, system }:

let
  version = "0.4.11";

  platforms = {
    x86_64-linux = {
      package = "nub-linux-x64";
      hash = "sha512-OOK2OSGu4IWqXYT2DUqT1FJa54nSC2GxAvmwyJ+1mAKMWMhni8XsrDItKbTyjJtloOzegS0vP+wC5vcRdW06rg==";
    };
    aarch64-linux = {
      package = "nub-linux-arm64";
      hash = "sha512-QR+C3eMP4s7y1RbNgY0rT+0gUDez8lZLKQHilJghj70+YWEp7TZh/EZQOUt1Y6iw9bd4VmMsMW/U3iKz3JHziA==";
    };
    x86_64-darwin = {
      package = "nub-darwin-x64";
      hash = "sha512-DYDcjDBPC7XHT7OEpLu1RMzvMF9+ZA9YuGeQR/NaYwGTi5DAwU90Vd2v32AKiKTyo127GfLJPXP1D9kXJCYvnA==";
    };
    aarch64-darwin = {
      package = "nub-darwin-arm64";
      hash = "sha512-v/yirnhWd8CT5JaBnbd4oOgp0/NmOGUME86KiJ6Qfy573i/ibLi7jnjBPdEtv56Ovn/QFQv0EISDi9wed3fUyg==";
    };
  };

  platform = platforms.${system};
in
pkgs.stdenvNoCC.mkDerivation {
  pname = "nub";
  inherit version;

  src = pkgs.fetchurl {
    url = "https://registry.npmjs.org/@nubjs/${platform.package}/-/${platform.package}-${version}.tgz";
    hash = platform.hash;
  };

  sourceRoot = "package";
  dontBuild = true;

  installPhase = ''
    runHook preInstall
    install -Dm755 bin/nub "$out/bin/nub"
    install -Dm755 bin/nubx "$out/bin/nubx"
    runHook postInstall
  '';
}
