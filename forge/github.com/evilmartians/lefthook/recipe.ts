import { Recipe } from "../../../../lib/models-zod/mod.ts";

export default new Recipe({
  name: "",
  about: {
    homepage: "http://localhst",
  },
  platforms: ["linux-x64", "windows-x64", "darwin-x64", "darwin-arm64"],
  versions: () => [],
  sources: (version, os, arch) => [
    { url: "", sha256: "" },
    { url: "", md5: "" },
    { gitUrl: "" },
  ],
  build: {
    script: () => {
      console.log("Hello World");
    },
  },
  test: {
    script: () => {},
  },
});
