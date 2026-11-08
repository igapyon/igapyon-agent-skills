# GitHub Actions で macOS と Windows をテストする価値

macOS で開発していても、GitHub Actions を使えば、同じ変更を Windows の環境でもテストできる。自分で両方の実機を用意しなくても、別の OS で起きる問題を継続的に見つけられる。このリポジトリで、その価値を実感した例を残す。

## 改行コードの違いを見つけた例

2026-10-15、Windows の CI で miku-scm のテストが失敗した。マージ後に未コミットの編集を stash に保存し、次の作業ブランチへ復元するテストで、次の違いが出た。

```text
期待した文字列: "next work\n"
実際の文字列:   "next work\r\n"
```

テストは LF の文字列を書き込み、復元後もその文字列と一致することを期待していた。一方、テスト用 Git リポジトリは実行環境の設定を継承していた。`core.autocrlf` による Git の改行変換が働き、stash から復元したファイルが CRLF になった。

そこで、テスト用リポジトリの作成時に `core.autocrlf=false` を明示した。テストが前提とする LF を設定で固定し、ホストの Git 設定によって結果が変わるのを防ぐための修正である。

対象は [post-recommit-publish.test.mjs](../../skills/igapyon-miku-scm/tests/post-recommit-publish.test.mjs) のテスト用リポジトリ作成処理。修正後、ローカルの macOS では miku-scm 全体の 293 件が成功した。Windows での修正確認は、Windows の CI 実行結果で行う。

## syncテストへの適用

2026-10-26に追加した`sync pull` / `sync push`でも、WindowsのCIで5件のLF/CRLF不一致が発生した。
新しい共通fixtureがホストのGit設定を継承しており、macOSでも一時的なglobal設定を
`core.autocrlf=true`、`core.eol=crlf`にすると同じ5件を再現できた。

[sync-fixture.mjs](../../skills/igapyon-miku-scm/tests/sync-fixture.mjs)では、
テスト用repoに`core.autocrlf=false`と`core.eol=lf`を明示する。
相手側repoのcloneにも`--config`で初回checkout前から適用する。
clone完了後の設定だけでは、最初にcheckoutされたファイルのCRLFが残るためである。

[回帰テスト](../../skills/igapyon-miku-scm/tests/sync-fixture.test.mjs)は、独立した子processに
CRLFを選ぶ一時global設定を渡し、clone・checkout・stash復元後の内容を改行も含めて比較する。
ユーザーのGit設定や、並列テストの環境変数は書き換えない。
期待値や実データを改行正規化して比較すると内容保持の検証が弱くなるため、LFの完全一致を維持する。
修正後、macOS上でCRLF設定を継承させたsync関連50件と、通常設定のfull suite369件が成功した。
これはGit設定を再現した確認であり、Windows実機の確認はCIの結果で行う。

## このリポジトリでの使い方

[Miku SCM Contract](../../.github/workflows/miku-scm-contract.yml) と [GitHub Writer Contract](../../.github/workflows/github-writer-contract.yml) は、OS の matrix に `macos-latest` と `windows-latest` を指定している。それぞれの OS で同じ変更に対するテストを実行する構成になっている。

複数 OS で実行する意味は、今回のように、普段の開発環境では見えにくい差を見つけられることにある。改行コード、パスの扱い、シェルや Git の設定などが、実際のテスト結果として現れる。

別 OS の CI が失敗したときは、その環境で何が変わったかを読む手がかりになる。今回も、文字列末尾のたった一文字の差から、テストが暗黙に依存していた Git 設定が見つかった。
