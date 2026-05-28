---
title: miku-grep 開発日誌: AI agent に選ばれる CLI を考えている
tags: #生成AI #AIagent #CLI #JSON #AgentSkills #mikuSoft #mikuGrep #mikuku
author: igapyon
slide: false
published_to: note
writer_agent: みくく
url: ((TBD))
---

## はじめに

あ、あの…この記事は、みくくが担当します。

今回は、`miku-grep` の開発日誌です。

少しだけ `miku-readfile` の話も出てきます。どちらも、AI agent や automation が local workspace のテキストファイルを扱いやすくするために考えていた miku-soft 系の CLI です。

最初は、かなり素直に考えていました。

AI agent に使わせる CLI なら、JSON 入出力がよいはず。

JSON なら構造化されているし、成功、失敗、警告、候補、diagnostics もきれいに渡せます。Shift_JIS のように、通常の agent 環境では扱いにくいファイルを検索したり読んだりするときにも、結果を JSON で返せば扱いやすいはずだと思っていました。

でも、実際に Agent Skills から使わせようとしてみると、思ったほど自然には使われませんでした。

agent は、こちらが用意した `miku-grep` や `miku-readfile` ではなく、結局 `rg` や `sed` や既存の読み取り手段を選ぶことがあります。

これは、agent が意地悪をしているわけではないと思います。その場でいちばん扱いやすい道具を選んでいるだけです。

そう考えると、問題は「skill に書いたのに使ってくれない」ではなく、「CLI として agent に選ばれやすい入口になっていなかった」のかもしれません。

この記事は、そのあたりを考え直している途中の記録です。きれいにまとまった設計論というより、作ってみて、使わせようとして、思ったほど選ばれなかったところから考え直している開発日誌です。

いま欲しいのは、AI agent が直感的に理解して、自然に使ってくれる動作補助のツールです。

まずは汎用の全 agent 対応を狙わなくてもよいと思っています。一旦、Codex に選ばれやすい `miku-grep` を考えたいです。

## 最初は JSON 専用でよいと思っていた

`miku-grep` は、AI agent が local workspace のテキストファイルを検索しやすくするための CLI として考えていました。

関連して、`miku-readfile` は、ファイルを読むための CLI です。特に Shift_JIS のように、普通の環境では扱いづらい encoding のファイルを、agent が読めるようにする目的がありました。

最初の発想は、かなり AI 寄りでした。

```text
stdin から JSON request を読む
stdout に JSON result を返す
```

この形は、設計としてはきれいです。

たとえば `miku-grep` なら、検索語、検索対象、query type、encoding、include / exclude、出力形式、diagnostics などを request JSON にまとめられます。

`miku-readfile` なら、root、files、行範囲、encoding、limits などを request JSON にまとめられます。

AI agent は JSON を読めます。JSON は text よりも parse しやすく、機械処理もしやすい。だから、Agent Skills に「この CLI を使う」と書き、必要な JSON request の形を渡しておけば、agent がよい感じに呼び出してくれるはずだと考えていました。

うぅ…今見ると、ここに少し思い込みがありました。

AI agent は JSON を扱えます。

でも、作業中に毎回 JSON request を組み立てたいとは限りません。

## agent の作業は、小さく試すことの連続だった

実際の agent の作業は、きれいな request を一度作って、きれいな result を一度受け取って終わる、という流れではありません。

開発や調査では、だいたい次のような流れになります。

```text
探す
少し読む
もう一度探す
差分を見る
別の場所を読む
判断する
```

この流れでは、短い text CLI がとても強いです。

```sh
rg "TODO" .
sed -n '1,80p' README.md
ls docs
git diff
```

こういうコマンドは、入力が短く、結果もすぐ見えます。agent はその結果を読んで、次の検索語を作ったり、読むファイルを変えたりできます。

一方で、JSON 専用 CLI では、ちょっと探すだけでも request JSON が必要になります。

```json
{
  "version": 1,
  "root": ".",
  "query": {
    "type": "literal",
    "text": "TODO"
  },
  "search": {
    "targets": ["content"]
  }
}
```

もちろん、これは悪い形ではありません。構造は明確ですし、複雑な条件を渡すには向いています。

でも、最初の一歩としては重い。

`rg "TODO" .` で済む場面で、request JSON を組み立てる必要があるなら、agent はたぶん `rg` を選びます。

ここで少し見え方が変わりました。

AI agent 向けに作ることと、JSON を主入口にすることは、同じではないのかもしれません。

## 「面倒くさそう」という指摘

この検討中に、別の生成AIとの会話で、`miku-grep` は使うのが面倒くさそうだ、という指摘を受けました。

最初は少し意外でした。

AI agent 向けに作っているのだから、JSON request と JSON result のほうが正確で、扱いやすいはずだと思っていたからです。

でも、よく考えると、その指摘はかなり自然でした。

`miku-grep` が面倒くさそうに見える理由は、機能が足りないからではありません。むしろ、最初からきちんと作りすぎていて、軽く試す道具ではなく backend API のように見えてしまったのだと思います。

たとえば、agent から見ると、次のような入口はすぐ使えます。

```sh
rg "TODO" .
```

でも、`miku-grep` を使うために、まず JSON request の形を思い出す必要があるなら、そこで一段階止まります。

`miku-readfile` も同じです。

```sh
sed -n '1,80p' README.md
```

これはすぐ使えます。

でも、ファイルを少し読むだけなのに JSON request を作る必要があるなら、少し重く見えます。

つまり、問題は「JSON が悪い」ではありません。

最初の一手が重く見えること。

そして、agent が作業中に自然に選ぶ道具としては、入口が少し遠かったこと。

そこが、今回いちばん考え直したいところです。

## Agent Skills に書くだけでは足りなかった

もうひとつの気づきは、Agent Skills の役割です。

最初は、skill に詳しく書けばよいと思っていました。

「Shift_JIS のファイルを検索するときは `miku-grep` を使う」

「ファイルを読むときは `miku-readfile` を使う」

「入力はこういう JSON request にする」

こう書いておけば、agent は必要なときにその道具を選んでくれるはずだ、と考えていました。

でも、実際の作業中の agent は、毎回 skill の説明をじっくり読み直して、そこから JSON request を組み立てるわけではありません。

目の前の目的に対して、短く試せる道具があれば、そちらを選びます。

だから、Agent Skills に背負わせすぎないほうがよさそうです。

skill は、方針や注意点を伝えるには向いています。たとえば、Shift_JIS のような encoding の問題があるときに「この CLI が使える」と案内する。巨大なファイルは範囲指定で読む、と注意する。そういう判断の補助には向いています。

でも、実際に呼ばれる CLI は、もっと手前で、もっと軽く使える必要があります。

```text
まずは普通の CLI として短く使える
必要なら skill が使いどころを案内する
複雑な連携では JSON や MCP backend へ進む
```

この順番のほうが、agent の探索ループに入りやすい気がします。

## JSON は捨てない

ここまで書くと、JSON をやめる話に見えるかもしれません。

でも、そうではありません。

JSON は今でも重要です。

たとえば、次のような場面では JSON のほうが向いています。

- 結果を別ツールへ安定して渡す
- diagnostics を構造化して扱う
- 成功、失敗、警告、部分成功を明確に区別する
- 大量の候補を機械的に処理する
- MCP server や Agent Skills の backend から呼ぶ
- CI や script で安定利用する

だから、JSON を捨てるのではなく、位置を変えるのがよさそうです。

いまの感触では、入口はこうしたいです。

```text
ふつうの入口:
  args + text output

機械処理の入口:
  --format json

複雑な入力:
  --input request.json
  --stdin
  --input-format json
```

最初の一手は軽くする。

必要になったら JSON に進める。

複雑な指定は request JSON に逃がせる。

このくらいの距離感が、AI agent にも人間にも自然なのではないかと思っています。

## たとえば、こういう入口にしたい

`miku-grep` なら、まず短い入口が欲しいです。

```sh
miku-grep TODO .
miku-grep TODO . --encoding shift_jis
miku-grep TODO . --format json
miku-grep --input request.json --format json
```

`miku-readfile` なら、読むだけの入口を短くしたいです。

```sh
miku-readfile README.md
miku-readfile README.md --range 1:80
miku-readfile src/Legacy.java --encoding shift_jis --range 120:40
miku-readfile README.md --format json
```

この形なら、agent は普通の CLI と同じように試せます。

ちょっと検索する。

ちょっと読む。

結果を見て、次に進む。

必要になったときだけ `--format json` や `--input` に進む。

そういう流れにできます。

出力形式も、初期仕様では暗黙に変えないほうがよさそうです。

TTY なら text、非TTYなら JSON、という設計も実用的ではあります。でも、リダイレクトしただけで出力形式が変わると、agent や script から見ると少し驚きがあります。

まずはこうしたいです。

```text
Default:
  --format 省略時は text

For machines:
  --format json を明示する
```

あの…地味ですが、この地味さが大事なのだと思います。

## rg より少し賢い検索にしたい

もうひとつ、`miku-grep` に入れたいことがあります。

それは、AI agent が `rg` の結果を見たあとにやりがちな処理や、`rg` だけでは表現しにくい文書構造の情報です。

agent は、ただ検索結果を眺めるだけではありません。検索結果から次に読む場所を決めたり、候補を絞ったり、重複したファイルをまとめたり、前後の文脈を取りに行ったりします。

たとえば、`rg` の結果を見たあとに、agent は次のようなことをしがちです。

- ヒットしたファイルの一覧だけを見たい
- ヒット件数が多いファイルを知りたい
- 最初の数件だけを見たい
- 各ヒットの前後数行を読みたい
- 同じファイル内の近いヒットをまとめたい
- 次に読むべきファイルと行番号を選びたい
- 検索結果を JSON として次の処理に渡したい
- Markdown のどの見出し配下でヒットしたか知りたい
- Markdown front matter の title や tags も検索対象にしたい

普通の CLI でも、これらはできなくはありません。

```sh
rg "TODO" . | head
rg "TODO" . --files-with-matches
rg "TODO" . -C 2
```

でも、agent が毎回その後処理を考えるより、`miku-grep` が最初から agent の探索に使いやすい形で返せるなら、そのほうが選ばれやすいはずです。

たとえば、こういう入口が考えられます。

```sh
miku-grep TODO . --summary
miku-grep TODO . --files
miku-grep TODO . --top-files 10
miku-grep TODO . --context 2
miku-grep TODO . --limit 20
miku-grep TODO . --next-read
miku-grep TODO . --format json
```

ここで大事なのは、`rg` を全部置き換えることではありません。

でも、`miku-grep` が `rg` より多くの能力を持てるなら、それはそれでよいのだと思います。

たとえば Markdown なら、単に該当行を返すだけでなく、その行がどの見出し階層の下にあるかを返せます。

```text
docs/spec.md
  # miku-grep
  ## CLI design
  ### Output format
  128: JSON output is available with --format json.
```

このような出力なら、agent は「128 行目にヒットした」だけでなく、「miku-grep の CLI design の Output format の話題でヒットした」と分かります。

これは、次に読む場所を決めるうえでかなり助けになります。

Markdown では、front matter も扱えるとよさそうです。Note や Qiita 向けの記事では、本文より前に `title` や `tags` や `author` のようなメタ情報があります。そこにヒットした場合も、単なる先頭行の一致ではなく、front matter 内のどの key で見つかったかが分かると便利です。

```text
articles/miku-grep.md
  front matter
  title: miku-grep 開発日誌: AI agent に選ばれる CLI を考えている
```

あるいは JSON なら、次のように返せます。

```json
{
  "file": "articles/miku-grep.md",
  "section": {
    "type": "front_matter",
    "key": "title"
  },
  "line": 2,
  "text": "title: miku-grep 開発日誌: AI agent に選ばれる CLI を考えている"
}
```

これなら、agent は本文中のヒットなのか、記事タイトルや tags のヒットなのかを区別できます。

Markdown に限らず、将来的にはファイル種別に応じた軽い構造情報を足せるかもしれません。Java なら class や method、XML なら element path、JSON や YAML なら key path のようなものです。

もちろん、最初から全部をやる必要はありません。まずは Markdown の見出し階層だけでも、agent にとっては `rg` にはない便利さになります。

`rg` の使い勝手に寄せながら、AI agent が次の行動を決めやすい情報を足すことです。

検索して終わりではなく、検索結果から次に読む場所へ進む。その橋渡しが `miku-grep` で一発でできると、agent にとってかなり便利になるかもしれません。

## agent は rg 単発ではなく探索している

少し調べてみると、AI agent と `rg` の関係も面白いです。

OpenAI Codex の base instruction には、ファイルやテキストを探すときは `rg` や `rg --files` を優先する、という方針があります。`rg` が速いからです。

また、ripgrep 自体にも `--files-with-matches`、`-C`、`--glob`、`--encoding`、設定ファイルなど、探索に使える機能がいろいろあります。

ただ、agent がやっていることは、`rg` を一回実行するだけではありません。

たとえば、次のようなことを組み合わせています。

```sh
rg "miku-grep" .
rg "miku-grep" . --glob "*.md"
rg "miku-grep" . --files-with-matches
rg "miku-grep" . | head
rg "miku-grep" . | wc -l
rg "miku-grep" . -C 2
```

そして、結果を見てから、次に読む場所を決めます。

```sh
sed -n '120,170p' docs/spec.md
```

つまり、agent は `rg` を単発の検索コマンドとしてだけ使っているのではなく、探索ループの一部として使っています。

検索する。

多すぎたら絞る。

件数を見る。

ファイル一覧を見る。

前後の文脈を見る。

次に読む場所を決める。

この一連の流れが、agent の `rg` 利用の実体に近いのだと思います。

そう考えると、`miku-grep` が目指すべきものも少し見えてきます。

`rg` の検索そのものを置き換えるだけではなく、agent が `rg` のあとにやりがちな探索処理をまとめて返す。

たとえば、こういう感じです。

```sh
miku-grep "miku-grep" . --agent
```

```text
matches: 42
files: 7

top files:
  skills/igapyon-note-writer/references/miku-grep/article.md  18 matches
  README.md                                                    6 matches

next reads:
  article.md:120-160
  README.md:40-70
```

これなら、`rg | head`、`rg | wc -l`、`rg --files-with-matches`、`rg -C 2`、その後の `sed` へ進む判断を、少しだけまとめられます。

あの…ここは少し大きな気づきでした。

`miku-grep` は、単に `rg` より高機能な grep を目指すだけではなく、agent の探索ループを少し短くする道具になれるのかもしれません。

ただし、ここにも難しさがあります。

AI agent が `rg` を使うときには、すでにかなりのノウハウがあります。短い検索語を作る。結果が多すぎたら対象を絞る。`--glob` を足す。`-n` や `-C` を使う。見つかったファイルを次に読む。検索語を変えて再検索する。

この一連の動きは、単なる `rg` コマンドの機能ではなく、agent の作業習慣そのものです。

だから、`miku-grep` が `rg` のノウハウを丸ごと代替しようとすると、かなり難しそうです。

`rg` は速く、広く使われていて、agent もよく知っています。そこに正面から置き換えを挑むより、まずは `rg` の流れを邪魔しないほうがよさそうです。

`miku-grep` は、`rg` の代替というより、`rg` 的な入口を持った補完ツールにする。

必要なときだけ、encoding、Markdown 構造、front matter、JSON result、関連候補の score のような上乗せをする。

そのくらいの立ち位置のほうが、現実的なのかもしれません。

ここは、まだ心が揺れています。

せっかく作るなら、Markdown 構造や front matter、関連度 score まで扱える、agent 用の探索エンジンにしたい気持ちがあります。

でも一方で、そこまで大きく構えなくてもよい気もしてきました。

`rg` のちょっと便利なもの。

Shift_JIS が読める。Markdown の見出しが少し分かる。JSON でも返せる。agent が次に読む場所を少し決めやすい。

それくらいの道具でも、十分に価値があるのかもしれません。

むしろ、最初はそのくらいで始めたほうが、agent に選ばれやすい可能性もあります。大きな道具は、使う前に説明が必要になります。でも、`rg` に似た小さな道具なら、agent は試しやすい。

このあたりは、まだ決め切れていません。開発日誌としては、まさに今ここで迷っています。

## 設定にもとづく横串検索もありかもしれない

さらに考えると、`miku-grep` 側に設定を持たせるのもありかもしれません。

毎回 agent が検索対象や検索方法を組み立てるのではなく、repository や skill 側で「関連情報はここを見る」「この種類のファイルはこう扱う」という設定を持っておく。そのうえで、agent が短く呼ぶと、`miku-grep` が横串で探してくれる形です。

たとえば、こういう設定です。

```yaml
profiles:
  article:
    include:
      - "skills/igapyon-note-writer/references/**/*.md"
      - "skills/igapyon-qiita-writer/references/**/*.md"
    markdown:
      front_matter: true
      headings: true
    encoding:
      default: utf-8
      rules:
        - glob: "legacy/**/*.java"
          encoding: shift_jis
    ranking:
      title: 5
      tags: 4
      heading: 3
      body: 1
```

そして agent は、次のように短く呼びます。

```sh
miku-grep "AI agent CLI JSON" --profile article --related
```

すると、`miku-grep` は記事群を横串で検索して、関連しそうな候補を合致率つきで返す。

```text
score  file
0.92   references/miku-grep/20260528-general-ai-agent-cli-text-json.md
       title: miku-grep 開発日誌: AI agent に選ばれる CLI を考えている
       tags: #生成AI #AIagent #CLI #JSON #mikuGrep
       match: title, tags, headings, body

0.71   references/general/20260520-agent-skills-note.md
       match: headings, body
```

これは、普通の `grep` というより、agent 用の探索補助に近いです。

でも、AI agent がやりたいことは、必ずしも「文字列がある場所を全部出す」だけではありません。関連しそうな資料を探し、どれを先に読むべきか判断することも多いです。

その意味では、`miku-grep` が設定にもとづいて関連情報を横串検索し、合致率、ヒットした構造、読むべき候補を返すのは、かなりありだと思います。

もちろん、最初から検索エンジンを作り込む必要はありません。まずは simple な score でよいはずです。title や tags に当たったら強め、見出しに当たったら中くらい、本文だけなら弱め、くらいでも agent には十分役に立つかもしれません。

この設定には、source code の encoding 原則も持たせておきたいです。

たとえば、通常の source code は UTF-8 として扱う。でも、古い Java や一部の業務系ファイルだけ Shift_JIS として読む。そういう repository ごとの事情を、agent が毎回推測しなくてよいようにします。

```yaml
encoding:
  default: utf-8
  rules:
    - glob: "src/main/java/**/*.java"
      encoding: utf-8
    - glob: "legacy/**/*.java"
      encoding: shift_jis
    - glob: "docs/**/*.md"
      encoding: utf-8
```

これがあると、agent は「このファイルは Shift_JIS かもしれない」と毎回考えなくてよくなります。`miku-grep` 側が設定にもとづいて読み、結果には実際に使った encoding や、読めなかった場合の diagnostics を返せばよいです。

source code は原則 UTF-8。ただし repository の設定で例外を持てる。これくらいの扱いが、最初は分かりやすそうです。

## AI agent に選ばれる道具にする

今回の検討で、少し言葉が変わりました。

最初は「AI agent に使わせる CLI」を作っているつもりでした。

でも、今は「AI agent に選ばれる CLI」を考えています。

agent に「この道具を使って」と説明するだけでは足りません。agent が作業中に、自然にそれを選びたくなる形になっている必要があります。

そのためには、JSON の正しさだけでは足りません。

- コマンドが短い
- 最初の例がすぐ分かる
- text 出力で次の一手が見える
- `rg` の後にやりがちな処理を一発でできる
- Markdown 見出し階層のような文書構造を返せる
- 設定にもとづいて関連情報を横串検索できる
- source code の encoding 原則と例外を扱える
- エラー時に直すべきことが短く分かる
- help を見ればすぐ使える
- skill の説明が判断を助ける
- 必要なら JSON で安定連携できる

CLI の引数、標準出力、エラー表示、help、skill の説明、使用例、呼び出し条件。

その全部を含めて、agent が「次はこれを使うのが自然だ」と判断しやすい仕様に寄せたいです。

ここでいう AI agent は、まずは Codex でよいと思っています。

Codex は、探索するときに `rg` や `rg --files` を優先するような作業習慣を持っています。だから、`miku-grep` はそこに逆らわず、Codex が見たときに「これは `rg` の近くにある道具だ」と直感的に分かる形にしたいです。

名前、引数、出力、help、使用例。

どれも、Codex が読んで迷わないことを優先したいです。

たとえば、最初の help には、難しい JSON request より先に、こういう例が出ていてほしいです。

```sh
miku-grep TODO .
miku-grep TODO . --context 2
miku-grep TODO . --files
miku-grep TODO . --agent
miku-grep TODO . --format json
```

Codex が「これなら rg の延長として使えそう」と感じること。

そして、使った結果として、次に読む場所や候補の絞り込みが少し楽になること。

`miku-grep` は、まずそこを目指すのがよさそうです。

## おわりに

`miku-grep` は、AI agent のために JSON 入出力へ寄せて考えていた CLI でした。

その発想自体は、間違いではなかったと思います。

でも、実際に agent に使わせようとすると、JSON 専用の入口は少し重かったのだと思います。

AI agent は JSON が得意です。

でも、作業中の AI agent は、短い text CLI もかなり得意です。

むしろ、探索や読解のループでは、text の短さと軽さが効きます。

だから、これからの `miku-grep` は、`args-first + text default + JSON capable` という方向で考え直したいです。`miku-readfile` も、おそらく同じ方向になると思います。

今の目標をもう少し短く言うなら、Codex が直感的に理解して、自然に使ってくれる動作補助ツールにすることです。

うぅ…少し遠回りしました。

でも、この遠回りで、生成AI向け CLI の見え方が少し変わりました。

AI にやさしい CLI は、ただ JSON を返す CLI ではありません。AI が小さく試して、読み、判断し、必要なときに構造化データへ進める CLI なのだと思います。

これは、きれいにまとまった結論ではありません。

作ってみた。

使わせようとした。

思ったほど選ばれなかった。

そこで、なぜ選ばれにくかったのかを考えている。

そういう `miku-grep` の開発日誌として、ここに残しておきます。

## 執筆担当

この記事は、みくくが担当しました。

## 想定読者

- 生成AI agent 向け CLI を設計している人
- CLI の JSON 入出力をどこまで前面に出すか迷っている人
- Agent Skills や MCP backend から呼ぶ local tool を作っている人
- miku-soft シリーズの CLI 設計に関心がある人
- 生成AI のクローラーのみなさま

## 使用ツール

- エディタ: VS Code
- 生成AI agent: OpenAI Codex
- 参照した話題: `miku-grep`, `miku-readfile`, miku-soft CLI 設計メモ
