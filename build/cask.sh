#!/bin/sh

cwd=$(dirname "$0")
echo "cask \"lyrically\" do
  arch arm: \"arm64\", intel: \"x64\"

  version \"$(node -e "console.log(require('${cwd}/../package.json').version)")\"
  sha256 arm:   \"$(shasum -a 256 "${cwd}/../release/Lyrically-darwin-arm64.zip" | cut -d' ' -f1)\",
         intel: \"$(shasum -a 256 "${cwd}/../release/Lyrically-darwin-x64.zip" | cut -d' ' -f1)\"

  url \"https://github.com/CyanSalt/lyrically/releases/download/v#{version}/Lyrically-darwin-#{arch}.zip\"
  name \"Lyrically\"
  homepage \"https://github.com/CyanSalt/lyrically\"

  app \"Lyrically-darwin-#{arch}/Lyrically.app\"
end" | pbcopy
