# Custom changelog templates

Cocogitto renders changelogs through the [Tera](https://keats.github.io/tera/docs/) template engine (Jinja2-like
syntax). Set `template` in `[changelog]` to a path ending in `.tera` (instead of `"default"`, `"full_hash"`, or
`"remote"`) to fully control the output. Reference: https://docs.cocogitto.io/reference/template.html — cocogitto's own
built-in templates live at https://github.com/cocogitto/cocogitto/tree/main/src/conventional/changelog/template if you
want a starting point to copy and adjust.

## Built-in macros (do this before hand-formatting commit lines)

Import once at the top of the template:

```tera
{% import "macros" as macros %}
```

Then call one of these inside a loop over commits, instead of reassembling the `- hash - summary - author` line
yourself:

| Macro                             | Renders                                                                                                                                  |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `macros::simple(commit=commit)`   | `- (**hello**) say hello to the galaxy - (da4af95) - *oknozor*`                                                                          |
| `macros::remote(commit=commit)`   | `- (**hello**) say hello to the galaxy - ([da4af95](https://github.com/.../commit/da4af95...)) - [@oknozor](https://github.com/oknozor)` |
| `macros::fullhash(commit=commit)` | `- da4af95b223bb8942ffd289d1a62d930c80d7bbd - (**hello**) say hello to the galaxy - @oknozor`                                            |

Example — a features-only section using the `remote` macro:

```tera
{% import "macros" as macros %}

#### Features

{% for commit in commits | filter(attribute="type", value="feat") %}
    {{ macros::remote(commit=commit) }}
{% endfor %}
```

## Writing it by hand

If the macros don't match the format you want, group and format commits directly. This is close to cocogitto's own
`default` template:

```tera
{% for type, typed_commits in commits | sort(attribute="type") | group_by(attribute="type") %}
#### {{ type | upper_first }}

    {% for scope, scoped_commits in typed_commits | group_by(attribute="scope") %}
        {% for commit in scoped_commits | sort(attribute="scope") %}
            {% if commit.author %}
                {% set author = "@" ~ commit.author %}
            {% else %}
                {% set author = commit.signature %}
            {% endif %}
            - {{ commit.id }} - (**{{ scope }}**) {{ commit.summary }} - {{ author }}
        {% endfor %}
    {% endfor %}
    {% for commit in typed_commits | unscoped %}
        {% if commit.author %}
            {% set author = "@" ~ commit.author %}
        {% else %}
            {% set author = commit.signature %}
        {% endif %}
            - {{ commit.id }} - {{ commit.summary }} - {{ author }}
    {% endfor %}
{% endfor %}
```

There's also a `group_by_type` filter that groups and sorts by cocogitto's configured commit-type order in one step
(nicer than `sort` + `group_by(attribute="type")` above, since it respects any custom `order` set in `[commit_types]`):

```tera
{% for type_group in commits | group_by_type %}
### {{ type_group.0 | upper_first }}
{% for commit in type_group.1 %}
    - {{ commit.summary }}
{% endfor %}
{% endfor %}
```

## Context available to templates

### `Release` (the top-level object)

| Field     | Type            | Nullable | Description                                  |
| --------- | --------------- | -------- | -------------------------------------------- |
| `commits` | `Array<Commit>` | no       | commits in this release                      |
| `version` | `GitRef`        | no       | tag/oid of this release's tip                |
| `from`    | `GitRef`        | no       | tag/oid of the commit preceding this release |
| `date`    | `Date`          | no       | release date                                 |

### `Commit`

| Field             | Type             | Nullable | Description                                                                                               |
| ----------------- | ---------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `id`              | `String` (SHA-1) | no       | commit hash                                                                                               |
| `author`          | `String`         | **yes**  | author's username on the remote platform (only populated when `[changelog.authors]` maps their signature) |
| `signature`       | `String`         | no       | raw git commit signature (name)                                                                           |
| `type`            | `String`         | no       | conventional commit type                                                                                  |
| `date`            | `Date`           | no       | commit date                                                                                               |
| `scope`           | `String`         | **yes**  | commit scope, if any                                                                                      |
| `summary`         | `String`         | no       | the one-line message summary                                                                              |
| `body`            | `String`         | **yes**  | commit message body                                                                                       |
| `breaking_change` | `boolean`        | no       | whether it's marked as breaking                                                                           |
| `footer`          | `Array<Footer>`  | no       | parsed footers/trailers (see below)                                                                       |

Because `author` is nullable, templates conventionally do:

```tera
{% if commit.author %}{% set author = "@" ~ commit.author %}{% else %}{% set author = commit.signature %}{% endif %}
```

### `GitRef` (used for `version` and `from`)

| Field | Type             | Nullable | Description                                                                         |
| ----- | ---------------- | -------- | ----------------------------------------------------------------------------------- |
| `tag` | `String`         | yes      | SemVer tag name (with `tag_prefix` if configured); `null` for unreleased changes    |
| `id`  | `String` (SHA-1) | yes      | commit id of the release tip; `null` only mid-`cog bump`, before the tag exists yet |

### `Footer`

Cocogitto auto-recognizes a few GitHub-specific trailer shapes in addition to generic `token: content` footers:

- **Generic footer**: `footer.token` (e.g. `"Reviewed-by"`), `footer.content`.
- **`Co-authored-by: Name <email>`** → `footer.github_co_authored_by.user` (raw name) and `.username` (nullable —
  populated only if that signature is mapped in `[changelog.authors]`):

  ```tera
  {%- if footer.github_co_authored_by -%}
    {%- if footer.github_co_authored_by.username -%}
      , @{{ footer.github_co_authored_by.username }}
    {%- else -%}
      , {{ footer.github_co_authored_by.user }}
    {%- endif -%}
  {%- endif -%}
  ```

- **`Closes #123` / `Fixes #456` / `Resolves #789`** → `footer.github_closes.gh_reference` (the bare number):

  ```tera
  {%- if footer.github_closes -%}
    Closes #{{ footer.github_closes.gh_reference }}
  {%- endif -%}
  ```

### `Remote` (populated from `[changelog]` remote/owner/repository config)

| Field            | Type     | Nullable | Description                             |
| ---------------- | -------- | -------- | --------------------------------------- |
| `platform`       | `String` | yes      | `https://{remote}`                      |
| `owner`          | `String` | yes      | repository owner                        |
| `repository_url` | `String` | yes      | `https://{remote}/{owner}/{repository}` |

## Extra filters (on top of Tera's [built-ins](https://keats.github.io/tera/docs/#built-in-filters))

| Filter          | Description                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `unscoped`      | keep only commits with no scope, e.g. `commits \| unscoped`                                       |
| `group_by_type` | group commits into `(type, Array<Commit>)` pairs, pre-sorted by cocogitto's configured type order |
| `upper_first`   | capitalize a string's first letter — handy for turning a raw `type` into a section heading        |
