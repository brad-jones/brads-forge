import { tags } from "npm:typia";
import type { XOR } from "ts-xor";
export interface BaseSource {
    /**
     * Patches may optionally be applied to the source. A path relative to the recipe file.
     */
    patches?: string[];
    /**
     * Within boa's work directory, you may specify a particular folder to place source into.
     * Boa will always drop you into the same folder (build folder/work), but it's up to you
     * whether you want your source extracted into that folder, or nested deeper.
     * This feature is particularly useful when dealing with multiple sources,
     * but can apply to recipes with single sources as well.
     */
    folder?: string;
}
export interface LocalSource extends BaseSource {
    /**
     * A path on the local machine that contains the source.
     */
    path: string;
    /**
     * By default, all files in the local path that are ignored
     * by git are also ignored by rattler-build.
     */
    useGitIgnore?: boolean & tags.Default<true>;
}
export type UrlSource = BaseSource & {
    /**
     * The url that points to the source.
     * This should be an archive that is extracted in the working directory.
     */
    url: string & tags.Format<"url">;
} & XOR<{
    /**
     * The SHA256 hash of the source archive.
     */
    sha256: string & tags.Pattern<"[a-fA-F0-9]{64}">;
}, {
    /**
     * The MD5 hash of the source archive.
     */
    md5: string & tags.Pattern<"[a-fA-F0-9]{32}">;
}>;
export interface GitSource extends BaseSource {
    /**
     * The url that points to the git repository.
     */
    gitUrl: string;
    /**
     * The git rev the checkout.
     */
    gitRev?: string & tags.Default<"HEAD">;
    /**
     * A value to use when shallow cloning the repository.
     */
    gitDepth?: number & tags.Default<0> & tags.Type<"int64">;
}
export type Source = XOR<LocalSource, UrlSource, GitSource>;
