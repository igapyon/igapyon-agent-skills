## 掲載先情報

- 掲載先: Note
- URL: （未記入）
- タイトル: 生成AI時代の repository engineering 入門
- ハッシュタグ: `生成AI`, `AI駆動開発`, `repository`, `contextengineering`, `AgentSkills`

----------------------------------------------------------------

## はじめに

そんなには強くない生成AIモデルを、なんとか実務で役立つものにしようとして、いろいろ試していました。

最初は、モデルへの頼み方や、プロンプトの書き方を工夫すればよいのだと思っていました。

ところが、実際に repository の中で作業してもらうと、問題はそれだけではありませんでした。

生成AI agent は、repository 全体を一度に理解しているわけではありません。
限られた context の中で、次に読むべきファイルを選び、検索し、結果を見て、また次の探索先を決めています。

生成AIと会話しながら試行錯誤していると、次のような観点が効果的だと教えてもらいました。

- semantic grep
- repository map
- code graph
- symbol search
- architecture-aware retrieval
- policy-aware search
- tool-mediated retrieval

最初に聞いたときは、素朴にびっくりしました。

単に「もっと README を書く」とか「プロンプトを工夫する」という話ではなく、repository の探索そのものを設計対象として見る、という方向だったからです。

ちょっとした感動がありました。そして、「生成AI agent と開発するとき、README・docs・TODO は会話の外の記憶になる」の記事にあるような取り組みも、それらに内包されるものだとも教えてもらいました。

この記事では、そのとき見えてきたことを、`repository engineering` という言葉で整理してみます。

## repository engineering という言葉

この記事では `repository engineering` という言葉を、次の意味で使います。

生成AI agent が repository を探索し、理解し、変更し、作業を再開しやすいように、repository の構造、文書、検索手段、生成物、作業メモ、ルールを設計すること。

まだ十分に定着した用語というより、生成AI時代の開発で必要になってきた実践を、いったんそう呼んで整理してみる、という位置づけです。

従来の開発でも、repository の構造は重要でした。

ソースコードをどのディレクトリに置くか。
README に何を書くか。
docs をどう分けるか。
生成物をどこに出すか。
テストやビルドの入口をどう揃えるか。

こうしたことは、もちろん昔から大事でした。

ただ、生成AI agent と一緒に開発するようになると、そこにもう一つ別の観点が加わります。

それは、生成AI agent が迷わず repository を探索できるかどうか、という観点です。

## AI は repository を一度に読んでいない

人間は repository を見るとき、ファイル一覧、README、過去の経験、命名規則、ディレクトリ構成などを、かなり柔軟に組み合わせて理解します。

生成AI agent も似たことをします。

ただし、生成AI agent は repository 全体を常に丸ごと頭に入れているわけではありません。

実際には、次のような情報を少しずつ集めています。

- `README.md`
- `TODO.md`
- `docs/`
- ファイル名やディレクトリ名
- `rg` などの検索結果
- テスト結果
- ビルドエラー
- git diff
- 既存の実装パターン
- 会話の中で与えられた制約

そして、その時点で見えている情報から、次に読むべき場所を推測します。

このとき、repository 側の構造が曖昧だと、生成AI agent は迷いやすくなります。

逆に、入口、地図、判断理由、作業メモ、検索しやすい名前、触ってはいけない場所が整理されていると、そこまで強くないモデルでも、かなり作業しやすくなります。

## 弱めモデルを戦力化するという見方

強いモデルを使えば、多くのことはかなりうまく進みます。

でも、いつも一番強いモデルを潤沢に使えるとは限りません。

モデルのコスト、速度、利用枠、社内ルール、ローカル実行の制約などがあります。

そのとき、弱めのモデルをどう戦力化するか、という発想が出てきます。

最初は、プロンプトを改善すればよいと思っていました。

もちろん、プロンプトは大事です。

ただ、実際にはプロンプトだけでは足りません。

repository の入口が分かりやすいこと。
作業再開のための TODO があること。
設計判断が docs に残っていること。
generated code や vendor code を読まなくてよいように分けていること。
検索ツールが repository の事情に合っていること。

こうしたことがあると、生成AI agent は無駄な探索を減らせます。

これは、弱いモデルに無理をさせるというより、モデルが迷わなくて済む環境を作る、という話です。

## context engineering との関係

最近は `context engineering` という言葉もよく聞くようになりました。

ざっくり言えば、生成AIに何を渡すか、どの情報を context に入れるか、どの情報を外に置くかを設計する考え方です。

repository engineering は、この context engineering とかなり近いところにあります。

ただし、repository engineering では、会話に入れる context だけでなく、repository そのものを対象にします。

たとえば、次のようなことです。

- `README.md` を入口として軽く保つ
- 詳細な設計判断は `docs/` に逃がす
- 作業の現在地は `TODO.md` に残す
- generated files と hand-written files を分ける
- vendor や upstream mirror を区別する
- AI agent が実行しやすい CLI を用意する
- repository 固有の検索 wrapper を用意する
- Agent Skills に repository の読み方を持たせる

つまり、context を会話の中だけで作るのではなく、repository の中にあらかじめ配置しておくという考え方です。

## retrieval が核心になる

repository が大きくなると、生成AI agent にとって最重要なのは「何を読むべきか」になります。

全部読むことはできません。

読まなくてよいものまで読ませると、context は膨らみます。
逆に、必要なものを読めなければ、的外れな変更になります。

そのため、retrieval が重要になります。

ここでいう retrieval は、単に検索窓にキーワードを入れることだけではありません。

repository の中から、いまの作業に必要な情報を探し出すための仕組み全体です。

その観点で見ると、最初に挙げた言葉がつながってきます。

## semantic grep

`semantic grep` は、単なる文字列検索ではなく、意味や関連概念も含めて探す考え方です。

たとえば、ある機能名を検索したいとき、その機能名そのものがコードに出てこないことがあります。

別名で呼ばれていたり、古い名前が残っていたり、docs や migration notes にだけ出てきたりします。

人間なら「あのあたりの意味のもの」を探します。

生成AI agent にも、それに近い探索手段があると助かります。

## repository map

`repository map` は、repository の地図です。

どこに core semantics があるのか。
どこが adapter layer なのか。
どこが generated files なのか。
どこが upstream mirror なのか。
どこに diagnostics や report が出るのか。

こうした地図があると、生成AI agent は repository 全体を少し把握しやすくなります。

これは、巨大な設計書を作るという話ではありません。

最初に読むべき入口と、読まなくてよい場所を区別するだけでもかなり効きます。

## code graph と symbol search

コードの依存関係は、文字列検索だけでは見えにくいことがあります。

どの関数がどこから呼ばれているのか。
どの class がどの interface を実装しているのか。
どの module がどこに import されているのか。

このような関係は、`code graph` として見えると扱いやすくなります。

また、`symbol search` も重要です。

grep で文字列を探すのではなく、class、method、interface、function などの構文上の単位で探すという考え方です。

Java のような言語では、source だけでなく bytecode や class metadata に寄る発想とも相性がよいです。

生成AI agent が欲しいのは、見た目の source だけではなく、implementation relation、inheritance、dependency、symbol graph のような意味構造であることがあります。

## architecture-aware retrieval

個人的にかなり重要だと思ったのが、`architecture-aware retrieval` です。

これは、この repository の設計思想に沿って探索する、という考え方です。

たとえば、ある repository で次のような方針があるとします。

- semantics は core に置く
- adapter は薄く保つ
- diagnostics は contract として扱う
- generated files は直接編集しない
- upstream mirror は独自改変しない

このような前提を知らないまま検索すると、生成AI agent は目についたファイルを読んで、目についた場所を直そうとします。

でも、repository の設計思想を知っていれば、まず core を見に行くべきなのか、adapter を見に行くべきなのか、docs を確認すべきなのかを判断しやすくなります。

これは、単なる検索性能ではなく、repository の読み方そのものです。

## policy-aware search

`policy-aware search` は、repository のルール込みで探索する考え方です。

たとえば、次のようなルールがあります。

- generated code は原則として除外する
- vendor 配下は読まない
- upstream mirror は参考にはするが編集対象にしない
- TODO を優先して読む
- architecture docs を優先して読む
- large binary や変換後成果物は検索対象から外す

生成AI agent が raw filesystem と raw grep だけを触っていると、このような repository 固有の事情を毎回推測することになります。

でも、検索ツールやドキュメント側に policy が埋め込まれていれば、探索の失敗を減らせます。

## tool-mediated retrieval

`tool-mediated retrieval` は、かなり総称に近い言葉だと思います。

AI が raw filesystem や raw grep を直接触るのではなく、意味付き tool を通して repository を探索する、という考え方です。

たとえば、私が考えていた次のようなものは、かなりこの方向に近いです。

- Agent Skills
- CLI wrapper
- `rg` / `grep` wrapper
- Shift_JIS 対応検索
- repository 固有の除外ルールを持つ検索
- diagnostics を読みやすく整形する tool

最初は、単に「検索しやすくするための便利道具」だと思っていました。

でも、生成AI agent の視点で見ると、これは repository の retrieval layer を作っていることになります。

この気づきは、かなり大きかったです。

## Shift_JIS 問題も本質的

現実の repository は、きれいな UTF-8 の source だけでできているとは限りません。

Shift_JIS のファイルがあります。
generated source があります。
壊れかけた legacy build があります。
古い命名規則があります。
vendor code があります。

人間なら「ああ、この repository はそういう事情があるのね」と思って回避できます。

でも、生成AI agent は検索失敗に弱いです。

検索できなかったものは、存在しないものとして扱ってしまうことがあります。

だから、repository に適応した探索 tool が必要になります。

これは、かなり実務的で重要な話だと思います。

## AI に優しい repository では足りない

ここまで考えると、これは単なる「AI に優しい repository」を作る話ではないように感じます。

もちろん、AI に優しい README を書くことは大事です。

でも、それだけではありません。

生成AI agent がどう repository を探索し、どこで迷い、どの情報を見落とし、どの構造があると復帰しやすいのかを観察する。

そのうえで、repository の構造、文書、検索手段、生成物、作業メモ、ルールを設計し直す。

それが、この記事でいう repository engineering です。

生成AIの認知特性を観察して、repository を再設計する。

大げさに聞こえるかもしれませんが、実際に生成AI agent と長く開発していると、この観点はかなり効いてくるように感じています。

## おわりに

生成AI時代の開発では、モデルそのものの性能ももちろん重要です。

でも、それだけではありません。

AI agent が何を読み、何を読まず、どの順番で探索し、どの情報を作業の前提にするのか。

そこを repository 側から支えることが、かなり大事になってきます。

`README.md`、`docs/`、`TODO.md`、repository map、検索 wrapper、Agent Skills、CLI、diagnostics。

これらは別々の工夫に見えます。

でも、生成AI agent が repository を探索し、理解し、変更し、作業を再開しやすくするための設計として見ると、かなり同じ方向を向いています。

私は今のところ、その方向を `repository engineering` と呼んで整理してみたいと思っています。

まだ手探りですが、この言葉には、これからの生成AI駆動開発で大事になりそうな感触があります。

## 関連記事

- Qiita: [miku-soft] 生成AI駆動開発における README / docs / TODO / workplace の使い分け
  - https://qiita.com/igapyon/items/e2002183dcdadf00ec59
- Note: 生成AI agent と開発するとき、README・docs・TODO は会話の外の記憶になる
  - https://note.com/toshikiigaa/n/n5dcb66e47151

## 想定読者

- 生成AI agent と repository の中で開発している人
- AI agent がどのファイルを読むべきか迷っているように感じたことがある人
- README、docs、TODO の役割をもう少し整理したい人
- 弱めの生成AIモデルを、repository 側の工夫で少しでも使いやすくしたい人
- context engineering や codebase retrieval に興味がある人

## 使用ツール

この記事の整理と更新には、次のツールを使っています。

- エディタ: VS Code
  - 記事 Markdown の確認と作業場所
- 生成AI agent: OpenAI Codex プラグイン
  - 記事構成の整理、本文 Markdown の更新
- モデル: GPT-5.5
  - 対話による執筆、構成整理、文面調整
- Agent Skills: https://github.com/igapyon/igapyon-agent-skills/tree/main/skills/igapyon-note-writer
  - Note 向け記事としての構成、説明粒度、文体の調整
