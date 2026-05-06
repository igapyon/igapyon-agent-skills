## [miku-javaclass2json] Java の .class / .jar を JSON / JSONL で索引化するアプリの使用方法

- 掲載先: Qiita
- URL: https://qiita.com/igapyon/items/5929580cc4ff4dac6329

---
title: [miku-javaclass2json] Java の .class / .jar を JSON / JSONL で索引化するアプリの使用方法
tags: mikuku Java Maven JSON AI駆動開発
author: igapyon
slide: false
---
## はじめに

`miku-javaclass2json-java` は、Java の `.class` ファイル、classes ディレクトリ、`.jar` ファイルを読み取り、JSON / JSONL の索引を生成するツールです。

現時点ではベータ版として扱っています。

生成される索引は、Java のコンパイル済み構造をあとから調べやすくするためのものです。たとえば、AI エージェントに Java のコードベースを扱わせる前に、クラス一覧、シンボル、依存関係、メソッド呼び出しの面を JSON / JSONL として渡しやすくできます。

この記事では、`miku-javaclass2json-java` の使い方だけを扱います。

## 何ができるか

`miku-javaclass2json-java` は、次の入力を索引化できます。

- classes ディレクトリ
- 単体の `.class` ファイル
- `.jar` ファイル

生成先には、たとえば次のようなディレクトリが作られます。

```text
.java-class-index/
  index.json
  classes.jsonl
  symbols.jsonl
  dependencies.jsonl
  method-calls.jsonl
  method-call-summary.jsonl
  method-call-reverse-summary.jsonl
  sources.jsonl
  warnings.log
  classes/
```

広く探すときは JSONL ファイルを使い、特定のクラスについて詳しく見たいときは `classes/` 配下のクラス別 JSON を開く、という使い方が基本です。

## CLI jar を入手する

CLI 用の jar は GitHub Releases の Asset から入手できます。

```sh
curl -L -o miku-javaclass2json-0.5.2.jar \
  https://github.com/igapyon/miku-javaclass2json-java/releases/download/v0.5.2/miku-javaclass2json-0.5.2.jar
```

入手した jar は、必要に応じて hash を確認しておくと安心です。

```sh
shasum -a 256 miku-javaclass2json-0.5.2.jar
```

バージョンは次のように確認できます。

```sh
java -jar miku-javaclass2json-0.5.2.jar --version
```

以降の例では、この jar を使います。

## classes ディレクトリを索引化する

コンパイル済みの `target/classes` を索引化する基本形は次の通りです。

```sh
java -jar miku-javaclass2json-0.5.2.jar index \
  --input target/classes \
  --output .java-class-index
```

`--input` には、classes ディレクトリを指定します。

`--output` には、索引の出力先ディレクトリを指定します。省略した場合は `.java-class-index` に出力されます。

## jar を索引化する

`.jar` ファイルを索引化する場合も、同じ `index` コマンドを使います。

たとえば、入手した `miku-javaclass2json` 自身の jar を索引化する場合は次のように実行します。

```sh
java -jar miku-javaclass2json-0.5.2.jar index \
  --input miku-javaclass2json-0.5.2.jar \
  --output .java-class-index-self
```

入力が `.jar` の場合、jar 内の `.class` が読み取られ、同じ形式の JSON / JSONL 索引が生成されます。

## Maven plugin として組み込む

Maven project では、`pom.xml` に Maven plugin として組み込むこともできます。

`pom.xml` には、たとえば次のように記述します。

```xml
<build>
  <plugins>
    <plugin>
      <groupId>jp.igapyon</groupId>
      <artifactId>miku-javaclass2json-maven-plugin</artifactId>
      <version>0.5.2</version>
      <executions>
        <execution>
          <phase>process-classes</phase>
          <goals>
            <goal>index</goal>
          </goals>
        </execution>
      </executions>
      <configuration>
        <classesDirectory>${project.build.outputDirectory}</classesDirectory>
        <outputDirectory>${project.basedir}/.java-class-index</outputDirectory>
        <excludePackages>
          <excludePackage>org.objectweb.*</excludePackage>
        </excludePackages>
        <excludeCallPackages>
          <excludeCallPackage>java.*</excludeCallPackage>
        </excludeCallPackages>
      </configuration>
    </plugin>
  </plugins>
</build>
```

デフォルトでは、`${project.build.outputDirectory}` を索引化し、`${project.basedir}/.java-class-index` に出力します。

通常の Java project で、まず `target/classes` を索引化したい場合は、CLI より Maven plugin のほうが自然な入口になることがあります。

Maven plugin をローカルの Maven repository にインストールする場合は、`miku-javaclass2json-java` のリポジトリで次のように実行します。

```sh
mvn clean install
```

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

特定クラスの詳細 JSON を直接見る場合は、`classes/` 配下を開きます。

```sh
rg '"name":"run"' .java-class-index/classes/jp/example/Foo.json
```

JSONL で広く候補を見つけ、必要になったらクラス別 JSON を読む、という流れにすると扱いやすいです。

## パッケージを除外する

大きな jar や shaded library を含む入力では、索引に含めたくないパッケージを除外できます。

```sh
java -jar miku-javaclass2json-0.5.2.jar index \
  --input miku-javaclass2json-0.5.2.jar \
  --output .java-class-index-self \
  --exclude-package 'org.objectweb.*'
```

`--exclude-package` は、対象パッケージを索引全体から外します。

除外対象は次のような出力に反映されます。

- `classes.jsonl`
- `sources.jsonl`
- `symbols.jsonl`
- `dependencies.jsonl`
- `method-calls.jsonl`
- method call summary 系 JSONL
- クラス別 JSON 内の dependencies / calls

クラスやシンボルは索引に残しつつ、メソッド呼び出し edge だけを除外したい場合は、`--exclude-call-package` を使います。

ワイルドカードを含むパターンは、シェルで展開されないように引用符で囲みます。

```sh
--exclude-package 'org.objectweb.*'
```

## 大きな入力を分割して処理する場合

通常の `index` コマンドは、小さな入力や単一プロセスでの実行に向いています。

大きな入力を分割処理する場合は、phase を明示して実行できます。

- `step1`: binary class name を集める
- `step2`: class 別 JSON を生成する
- `step3`: JSONL 索引と `index.json` を生成する
- `step4`: reverse summary 系の派生索引を生成する

たとえば、既に `method-call-summary.jsonl` がある出力ディレクトリに対して、reverse summary を生成する場合は次のように実行します。

```sh
java -jar miku-javaclass2json-0.5.2.jar index \
  --phase step4 \
  --output .java-class-index
```

複数プロセスで分割実行する場合、同じ output directory に同時書き込みしないようにします。既存のクラス JSON は後から書いた内容で上書きされ、warning は `warnings.log` に追記されます。

## 出力を見るときの入口

生成されたファイルは、用途ごとに見る入口を分けると分かりやすいです。

| ファイル | 用途 |
| --- | --- |
| `index.json` | 生成結果の概要を見る |
| `classes.jsonl` | クラス単位で広く検索する |
| `symbols.jsonl` | メソッドやフィールドなどのシンボルを探す |
| `dependencies.jsonl` | クラス間の依存関係を見る |
| `method-calls.jsonl` | メソッド呼び出しを行単位で検索する |
| `method-call-summary.jsonl` | 呼び出し edge を集約して見る |
| `method-call-reverse-summary.jsonl` | 呼ばれる側から呼び出し元を探す |
| `sources.jsonl` | 入力元とクラスの対応を見る |
| `warnings.log` | duplicate class などの warning を見る |
| `classes/` | クラス別の詳細 JSON を見る |

AI エージェントに渡す場合も、最初からすべてを読ませるのではなく、まず JSONL の索引で候補を絞ってから、必要なクラス別 JSON を読む形にすると扱いやすくなります。

## 注意点

`miku-javaclass2json-java` は、Java bytecode から得られる構造を JSON / JSONL にするツールです。

そのため、出力には JVM descriptor が JVM descriptor のまま含まれます。

また、`invokedynamic` は bytecode level の call surface として記録されます。lambda body、文字列結合 recipe、bootstrap method の意味までは、高水準の Java 概念として展開されません。

出力される JSONL は、クラス数、メンバー数、依存関係、bytecode call surface に応じて大きくなります。大きなシステムを対象にする場合は、最初に `--exclude-package` や `--exclude-call-package` の方針を決めてから索引化すると扱いやすくなります。

## まとめ

`miku-javaclass2json-java` は、Java の `.class` / `.jar` / classes ディレクトリを JSON / JSONL に索引化するツールです。

CLI では `java -jar ... index --input ... --output ...` の形で実行できます。Maven project では Maven plugin として明示実行することもできます。

生成された JSONL を `rg` などで検索し、必要に応じて `classes/` 配下のクラス別 JSON を読むことで、コンパイル済み Java コードの構造や呼び出し面を調べやすくなります。

## 想定読者

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

## Appendix

### CLI の完全なパラメータ説明

CLI の基本形は次の通りです。

```sh
java -jar miku-javaclass2json-0.5.2.jar --version
java -jar miku-javaclass2json-0.5.2.jar index [options]
```

`index` は、`.class` ファイル、classes ディレクトリ、`.jar` ファイルを読み取り、JSON / JSONL の索引を生成するコマンドです。

| パラメータ | 必須 | 複数指定 | 説明 |
| --- | --- | --- | --- |
| `--help` | いいえ | いいえ | ヘルプを表示します。`-h` も同じです。 |
| `--version` | いいえ | いいえ | バージョンを表示します。`-v` も同じです。`index` ではなくトップレベルで指定します。 |
| `--input <path>` | `step4` 以外では必須 | いいえ | 入力にする classes ディレクトリ、単体の `.class` ファイル、または `.jar` ファイルを指定します。 |
| `--output <dir>` | いいえ | いいえ | 索引の出力先ディレクトリを指定します。省略時は `.java-class-index` です。 |
| `--phase <phase>` | いいえ | いいえ | 分割処理の phase を指定します。省略時は `all` 相当の一括処理です。 |
| `--step1-output <dir\|binary-names.jsonl>` | `step2` / `step3` では必須 | はい | `step1` で生成した binary name 一覧を指定します。ディレクトリを指定した場合は、その中の `binary-names.jsonl` が読まれます。 |
| `--exclude-package <binary.package.*>` | いいえ | はい | 指定したパッケージに一致するクラスを索引対象から除外します。 |
| `--exclude-call-package <binary.package.*>` | いいえ | はい | クラスやシンボルは残しつつ、指定したパッケージに関係する method call edge だけを除外します。 |

`--phase` に指定できる値は次の通りです。

| phase | 説明 |
| --- | --- |
| `all` | 既定の一括処理です。class name 収集、クラス別 JSON、JSONL 索引、reverse summary 生成まで実行します。 |
| `step1` | 入力を読み、`binary-names.jsonl` を生成します。 |
| `step2` | 入力と `--step1-output` の binary name 一覧を使い、`classes/<binaryName>.json` を生成します。 |
| `step3` | 入力と `--step1-output` の binary name 一覧を使い、行指向の JSONL 索引と `index.json` を生成します。reverse summary は生成しません。 |
| `step4` | 既存の `method-call-summary.jsonl` から `method-call-reverse-summary.jsonl` を生成します。`.class` / `.jar` は読みません。 |

パッケージ指定では、たとえば `org.objectweb.*` のような wildcard pattern を使えます。
シェルで `*` が展開されないように、コマンドラインでは引用符で囲みます。

```sh
java -jar miku-javaclass2json-0.5.2.jar index \
  --input app.jar \
  --output .java-class-index \
  --exclude-package 'org.objectweb.*' \
  --exclude-call-package 'java.*'
```

### Maven plugin の完全なパラメータ説明

Maven plugin の goal は `index` です。

```xml
<plugin>
  <groupId>jp.igapyon</groupId>
  <artifactId>miku-javaclass2json-maven-plugin</artifactId>
  <version>0.5.2</version>
</plugin>
```

利用できる plugin parameter は次の通りです。

| parameter | property | 型 | 既定値 | 説明 |
| --- | --- | --- | --- | --- |
| `classesDirectory` | `miku-javaclass2json.classesDirectory` | `File` | `${project.build.outputDirectory}` | 索引化する classes ディレクトリを指定します。通常は `target/classes` です。 |
| `outputDirectory` | `miku-javaclass2json.outputDirectory` | `File` | `${project.basedir}/.java-class-index` | 索引の出力先ディレクトリを指定します。 |
| `skip` | `miku-javaclass2json.skip` | `boolean` | `false` | `true` の場合、索引生成をスキップします。 |
| `excludePackages` | `miku-javaclass2json.excludePackages` | `String[]` | なし | 指定したパッケージに一致するクラスを索引対象から除外します。 |
| `excludeCallPackages` | `miku-javaclass2json.excludeCallPackages` | `String[]` | なし | 指定したパッケージに関係する method call edge だけを除外します。 |

`pom.xml` の `<configuration>` では、たとえば次のように指定します。

```xml
<configuration>
  <classesDirectory>${project.build.outputDirectory}</classesDirectory>
  <outputDirectory>${project.basedir}/.java-class-index</outputDirectory>
  <skip>false</skip>
  <excludePackages>
    <excludePackage>org.objectweb.*</excludePackage>
  </excludePackages>
  <excludeCallPackages>
    <excludeCallPackage>java.*</excludeCallPackage>
  </excludeCallPackages>
</configuration>
```
