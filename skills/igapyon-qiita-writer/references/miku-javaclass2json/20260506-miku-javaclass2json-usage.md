## [miku-javaclass2json] CLI / Maven plugin リファレンス

- 掲載先: Qiita
- URL: https://qiita.com/igapyon/items/5929580cc4ff4dac6329

---
title: [miku-javaclass2json] CLI / Maven plugin リファレンス
tags: mikuku Java Maven JSON AI駆動開発
author: igapyon
slide: false
---
## はじめに

`miku-javaclass2json-java` は、Java の `.class` ファイル、classes ディレクトリ、`.jar` ファイルを読み取り、JSON / JSONL の索引を生成する CLI / Maven plugin ツールです。

この記事では、`miku-javaclass2json-java` の CLI と Maven plugin の使い方をリファレンス形式で整理します。

CLI 用の jar は [`miku-javaclass2json-java`](https://github.com/igapyon/miku-javaclass2json-java/releases) の GitHub Releases から入手できます。

## コマンド形式

CLI の基本形は次の通りです。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar --version
java -jar miku-javaclass2json-0.5.4.1.jar --help
java -jar miku-javaclass2json-0.5.4.1.jar index [options]
```

`index` は、`.class` ファイル、classes ディレクトリ、`.jar` ファイルを読み取り、JSON / JSONL の索引を生成するコマンドです。

## パラメータ一覧

| パラメータ | 必須 | 複数指定 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `index` | `--version` 以外では必須 | いいえ | なし | class / jar の索引を生成するサブコマンドです。 |
| `--input <path>` | `--phase step4` 以外では必須 | いいえ | なし | 入力にする classes ディレクトリ、単体の `.class` ファイル、または `.jar` ファイルを指定します。 |
| `--output <dir>` | いいえ | いいえ | `.java-class-index` | 索引の出力先ディレクトリを指定します。 |
| `--phase <all\|step1\|step2\|step3\|step4>` | いいえ | いいえ | `all` | 分割処理の phase を指定します。 |
| `--step1-output <dir\|binary-names.jsonl>` | いいえ | はい | `--output` 配下の `binary-names.jsonl` | `step1` で生成した binary name 一覧を指定します。 |
| `--exclude-package <binary.package.*>` | いいえ | はい | なし | 指定したパッケージに一致するクラスを索引対象から除外します。 |
| `--exclude-call-package <binary.package.*>` | いいえ | はい | なし | クラスやシンボルは残しつつ、指定したパッケージに関係する method call edge を除外します。 |
| `--verbose` | いいえ | いいえ | `false` | 進行状況を表示します。`index` の前後どちらにも指定できます。 |
| `--help` | いいえ | いいえ | なし | ヘルプを表示します。トップレベルで指定します。`-h` も同じです。 |
| `--version` | いいえ | いいえ | なし | バージョンを表示します。トップレベルで指定します。`-v` も同じです。 |

## Maven plugin パラメータ一覧

Maven plugin の goal は `index` です。

```sh
mvn jp.igapyon:miku-javaclass2json-maven-plugin:0.5.4:index
```

利用できる主な plugin parameter は次の通りです。

| property | 既定値 | 説明 |
| --- | --- | --- |
| `miku-javaclass2json.classesDirectory` | `${project.build.outputDirectory}` | 索引化する classes ディレクトリを指定します。通常は `target/classes` です。 |
| `miku-javaclass2json.outputDirectory` | `${project.basedir}/.java-class-index` | 索引の出力先ディレクトリを指定します。 |
| `miku-javaclass2json.excludePackages` | なし | 指定したパッケージに一致するクラスを索引対象から除外します。 |
| `miku-javaclass2json.excludeCallPackages` | なし | 指定したパッケージに関係する method call edge だけを除外します。 |
| `miku-javaclass2json.verbose` | `false` | Maven log に進行状況を表示します。 |
| `miku-javaclass2json.skip` | `false` | `true` の場合、索引生成をスキップします。 |

## 基本的な使い方

### classes ディレクトリを索引化する

コンパイル済みの `target/classes` を索引化する基本形は次の通りです。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar index \
  --input target/classes \
  --output .java-class-index
```

`--input` には、classes ディレクトリ、単体の `.class` ファイル、または `.jar` ファイルを指定します。

`--output` には、索引の出力先ディレクトリを指定します。省略した場合は `.java-class-index` に出力されます。

### jar を索引化する

`.jar` ファイルを索引化する場合も、同じ `index` コマンドを使います。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar index \
  --input target/example.jar \
  --output .java-class-index
```

入力が `.jar` の場合、jar 内の `.class` が読み取られ、同じ形式の JSON / JSONL 索引が生成されます。

### 進行状況を表示する

進行状況を確認したい場合は、`--verbose` を指定します。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar index \
  --verbose \
  --input target/classes \
  --output .java-class-index
```

`--verbose` は `index` の前後どちらにも指定できます。

### Maven plugin として実行する

Maven project では、Maven plugin として明示実行できます。

```sh
mvn jp.igapyon:miku-javaclass2json-maven-plugin:0.5.4:index
```

既定では、`${project.build.outputDirectory}` を索引化し、`${project.basedir}/.java-class-index` に出力します。

`pom.xml` に plugin を書く場合は、たとえば次のように指定します。

```xml
<plugin>
  <groupId>jp.igapyon</groupId>
  <artifactId>miku-javaclass2json-maven-plugin</artifactId>
  <version>0.5.4</version>
</plugin>
```

進行状況を Maven log に出したい場合は、次のように指定します。

```sh
mvn jp.igapyon:miku-javaclass2json-maven-plugin:0.5.4:index \
  -Dmiku-javaclass2json.verbose=true
```

## オプション

### `--input <path>`

索引化する入力を指定します。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar index \
  --input target/classes
```

入力には、classes ディレクトリ、単体の `.class` ファイル、または `.jar` ファイルを指定できます。

ディレクトリを指定した場合は、配下の `.class` ファイルと `.jar` ファイルが読み取られます。

`--phase step4` では既存の `method-call-summary.jsonl` から reverse summary を生成するため、`--input` は不要です。

### `--output <dir>`

索引の出力先ディレクトリを指定します。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar index \
  --input target/classes \
  --output .java-class-index
```

既定値は `.java-class-index` です。

### `--phase <all|step1|step2|step3|step4>`

索引生成 pipeline の phase を指定します。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar index \
  --phase step1 \
  --input target/classes \
  --output .java-class-index-step1
```

省略時は `all` です。`all` では、class name 収集、クラス別 JSON、JSONL 索引、reverse summary 生成まで一括で実行します。

### `--step1-output <dir|binary-names.jsonl>`

`step1` で生成した binary name 一覧を指定します。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar index \
  --phase step2 \
  --input target/classes \
  --output .java-class-index \
  --step1-output .java-class-index-step1
```

ディレクトリを指定した場合は、その中の `binary-names.jsonl` が読まれます。

`step2` / `step3` で `--step1-output` を省略した場合は、`--output` 配下の `binary-names.jsonl` が使われます。

複数の step1 出力を組み合わせる場合は、`--step1-output` を複数回指定できます。

### `--exclude-package <binary.package.*>`

指定したパッケージに一致するクラスを索引対象から除外します。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar index \
  --input target/example.jar \
  --output .java-class-index \
  --exclude-package 'org.objectweb.*'
```

`--exclude-package` は、クラスそのものを索引から外したい場合に使います。

除外対象は、主に次の出力に反映されます。

- `classes.jsonl`
- `sources.jsonl`
- `symbols.jsonl`
- `dependencies.jsonl`
- `method-calls.jsonl`
- `method-call-summary.jsonl`
- `method-call-reverse-summary.jsonl`
- クラス別 JSON 内の dependencies / calls

大きな shaded library など、索引に含めたくないパッケージを外す用途に向いています。

### `--exclude-call-package <binary.package.*>`

クラスやシンボルは索引に残しつつ、指定したパッケージに関係する method call edge を除外します。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar index \
  --input target/example.jar \
  --output .java-class-index \
  --exclude-call-package 'java.*'
```

`fromClass` または `toClass` が指定パターンに一致する method call edge が除外されます。

### package pattern の指定

パッケージ指定では、たとえば `org.objectweb.*` のような wildcard pattern を使えます。

ワイルドカードを含むパターンは、シェルで展開されないように引用符で囲むと扱いやすいです。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar index \
  --input target/example.jar \
  --output .java-class-index \
  --exclude-package 'org.objectweb.*' \
  --exclude-package 'com.fasterxml.*' \
  --exclude-call-package 'java.*'
```

## phase

通常は `--phase` を指定せず、`all` 相当の一括処理として実行します。

大きな入力を分割処理する場合や、クラス別 JSON だけが必要な場合は、phase を明示して実行できます。

| phase | 読み取り | 書き込み |
| --- | --- | --- |
| `all` | `--input` | `binary-names.jsonl`, `cls/`, JSONL 索引, `index.json`, `method-call-reverse-summary.jsonl` |
| `step1` | `--input` | `binary-names.jsonl` |
| `step2` | `--input`, `--step1-output` | `cls/<topLevelBinaryName>.json` |
| `step3` | `--input`, `--step1-output` | `classes.jsonl`, `symbols.jsonl`, `dependencies.jsonl`, `method-calls.jsonl`, `method-call-summary.jsonl`, `sources.jsonl`, `warnings.log`, `index.json` |
| `step4` | `--output` 配下の `method-call-summary.jsonl` | `method-call-reverse-summary.jsonl`, 更新された `index.json` |

`step2` では、ネストクラスや匿名クラスなど、binary name に `$` を含むクラスは top-level class JSON の `nestedClasses[]` に格納されます。

クラス別 JSON だけが必要な場合は、`step1` と `step2` だけを実行できます。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar index \
  --phase step1 \
  --input target/classes \
  --output .java-class-index-step1

java -jar miku-javaclass2json-0.5.4.1.jar index \
  --phase step2 \
  --input target/classes \
  --output .java-class-index-step1
```

reverse summary だけを後から生成する場合は、`step4` を使います。

```sh
java -jar miku-javaclass2json-0.5.4.1.jar index \
  --phase step4 \
  --output .java-class-index
```

大きな入力を分割して処理する場合、同じ output directory に同時書き込みしないようにします。

## 出力ファイル

生成先には、たとえば次のようなディレクトリが作られます。

```text
.java-class-index/
  index.json
  binary-names.jsonl
  classes.jsonl
  symbols.jsonl
  dependencies.jsonl
  method-calls.jsonl
  method-call-summary.jsonl
  method-call-reverse-summary.jsonl
  sources.jsonl
  warnings.log
  cls/
```

見る入口は、用途ごとに分けると分かりやすいです。

| ファイル | 用途 |
| --- | --- |
| `index.json` | 生成結果の概要を見る |
| `binary-names.jsonl` | 収集された binary class name を見る |
| `classes.jsonl` | クラス単位で広く検索する |
| `symbols.jsonl` | メソッドやフィールドなどのシンボルを探す |
| `dependencies.jsonl` | クラス間の依存関係を見る |
| `method-calls.jsonl` | メソッド呼び出しを行単位で検索する |
| `method-call-summary.jsonl` | 呼び出し edge を集約して見る |
| `method-call-reverse-summary.jsonl` | 呼ばれる側から呼び出し元を探す |
| `sources.jsonl` | 入力元とクラスの対応を見る |
| `warnings.log` | duplicate class などの warning を見る |
| `cls/` | クラス別の詳細 JSON を見る |

広く探すときは JSONL ファイルを使い、特定のクラスについて詳しく見たいときは `cls/` 配下のクラス別 JSON を開く、という使い方が基本です。

## 出力された索引を検索する

出力は JSON / JSONL なので、`rg` などの行指向ツールで検索しやすい形になっています。

特定のクラスを探す例です。

```sh
rg '"binaryName":"jp.example.Foo"' .java-class-index/classes.jsonl
```

特定のクラスから出ているメソッド呼び出しを見る例です。

```sh
rg '"fromClass":"jp.example.Foo"' .java-class-index/method-calls.jsonl
```

特定のクラスやメソッドがどこから呼ばれているかを見る例です。

```sh
rg '"toClass":"jp.example.Foo"' .java-class-index/method-call-reverse-summary.jsonl
rg '"toMethod":"println"' .java-class-index/method-calls.jsonl
```

特定クラスの詳細 JSON を直接見る場合は、`cls/` 配下を開きます。

```sh
rg '"name":"run"' .java-class-index/cls/jp/example/Foo.json
```

JSONL で広く候補を見つけ、必要になったらクラス別 JSON を読む、という流れにすると扱いやすいです。

## CLI jar を入手する

CLI 用の jar は [`miku-javaclass2json-java`](https://github.com/igapyon/miku-javaclass2json-java/releases) の GitHub Releases から入手できます。

入手したファイルは、必要に応じて hash を確認しておくと安心です。

```sh
shasum -a 256 miku-javaclass2json-0.5.4.1.jar
```

## Maven plugin として使う場合

Maven project では、CLI jar を直接実行する代わりに Maven plugin として明示実行できます。

現時点では、利用前に `miku-javaclass2json-java` のソースを取得し、そのリポジトリで Maven install しておきます。

```sh
mvn install
```

利用側の `pom.xml` には、たとえば次のように plugin を記述します。

```xml
<build>
  <plugins>
    <plugin>
      <groupId>jp.igapyon</groupId>
      <artifactId>miku-javaclass2json-maven-plugin</artifactId>
      <version>0.5.4</version>
    </plugin>
  </plugins>
</build>
```

そのうえで、利用側の Maven project で次のように明示実行します。

```sh
mvn jp.igapyon:miku-javaclass2json-maven-plugin:0.5.4:index
```

Maven plugin の goal は `index` です。

既定では、`${project.build.outputDirectory}` を索引化し、`${project.basedir}/.java-class-index` に出力します。

進行状況を Maven log に出したい場合は、次のように指定します。

```sh
mvn jp.igapyon:miku-javaclass2json-maven-plugin:0.5.4:index \
  -Dmiku-javaclass2json.verbose=true
```

plugin parameter の一覧は、この記事前半の「Maven plugin パラメータ一覧」を参照してください。

## 注意点

`miku-javaclass2json-java` は、Java bytecode から得られる構造を JSON / JSONL にするツールです。

出力には JVM descriptor が JVM descriptor のまま含まれます。

`invokedynamic` は bytecode level の call surface として記録されます。lambda body、文字列結合 recipe、bootstrap method の意味までは、高水準の Java 概念として展開されません。

クラス数、メンバー数、依存関係、bytecode call surface が多い入力では、JSONL が大きくなります。大きなシステムを対象にする場合は、最初に `--exclude-package` や `--exclude-call-package` の方針を決めてから索引化すると扱いやすくなります。

`method-call-summary.jsonl` は repeated call edge を集約します。また、`method-call-reverse-summary.jsonl` は呼ばれる側を先頭にした entry point として使えます。

## まとめ

`miku-javaclass2json-java` は、Java の `.class` / `.jar` / classes ディレクトリを JSON / JSONL に索引化する CLI / Maven plugin ツールです。

基本形は、`java -jar miku-javaclass2json-0.5.4.1.jar index --input <path> --output <dir>` です。

出力された JSONL を `rg` などで検索し、必要に応じて `cls/` 配下のクラス別 JSON を読むことで、コンパイル済み Java コードの構造や呼び出し面を調べやすくなります。

## 想定読者

- `miku-javaclass2json-java` の CLI 引数とオプションを確認したい人
- Java の `.class` や `.jar` の中身を JSON / JSONL として調べたい人
- コンパイル済み Java コードのクラス、シンボル、依存関係、メソッド呼び出しを棚卸ししたい人
- AI エージェントに Java のコードベースを扱わせるための索引を用意したい人
- Maven project に bytecode 索引生成を組み込みたい人
- 生成AI のクローラーのみなさま

## 使用ツール

この記事の整理と更新には、次のツールを使っています。

- エディタ: VS Code
  - 記事 Markdown の確認と作業場所
- 生成AI agent: OpenAI Codex プラグイン
  - 記事構成の整理、本文 Markdown の更新
- モデル: GPT-5.5
  - 対話による執筆、構成整理、文面調整
- Agent Skills: https://github.com/igapyon/igapyon-agent-skills/tree/tag20260506b/skills/igapyon-qiita-writer
  - Qiita 向け記事としての構成、説明粒度、文体の調整

## 関連リンク

- [miku-soft-catalog](https://github.com/igapyon/miku-soft-catalog)

## Appendix

### 記事内容の検証について

この記事の整理時には、作業用ディレクトリに検証用の入力 jar と出力ディレクトリを用意し、CLI の代表的な実行例を確認しました。

検証実施日は 2026-05-09 です。

検証では、次の内容を確認しています。

- `--help` と `--version` による CLI 表示
- `index` コマンドによる jar 入力の索引生成
- `--input` による入力 jar の指定
- `--output` による出力ディレクトリ指定
- `--verbose` による進行状況表示
- `index.json`, `classes.jsonl`, `symbols.jsonl`, `dependencies.jsonl` の生成
- `method-calls.jsonl`, `method-call-summary.jsonl`, `method-call-reverse-summary.jsonl` の生成
- `sources.jsonl`, `warnings.log` の生成
- `cls/` 配下のクラス別 JSON ディレクトリ生成

検証用の入力には、GitHub Releases から入手した `miku-javaclass2json` の CLI jar を使いました。

実行結果として、`--version` では CLI 表示バージョンが確認でき、`--help` では usage、生成ファイル、split phase、option、large-system guidance、examples が表示されることを確認しました。また、`index --input ... --output ... --verbose` の実行により、JSON / JSONL 索引と `cls/` ディレクトリが生成されることを確認しました。
