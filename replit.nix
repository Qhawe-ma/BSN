{ pkgs }: {
  deps = [
    pkgs.nodejs-20_x
    pkgs.nodePackages.npm
    pkgs.python3
    pkgs.python3Packages.pip
    pkgs.make
    pkgs.gcc
    pkgs.pkg-config
  ];
  env = {
    PYTHON = "${pkgs.python3}/bin/python3";
    NODE_ENV = "production";
  };
}

