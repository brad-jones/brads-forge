import type { XOR } from "ts-xor";

export interface CommandTestElement {
  /**
   * A script to run to perform the test.
   */
  script?: string | string[] | (() => Promise<void> | void);

  /**
   * Additional dependencies to install before running the test.
   */
  extraRequirements?: {
    /**
     * extra requirements with build_platform architecture (emulators, ...)
     */
    build?: string | string[];

    /**
     * extra run dependencies
     */
    run?: string | string[];
  };

  /**
   * Additional files to include for the test.
   */
  files?: {
    /**
     * extra files from $SRC_DIR
     */
    source?: string | string[];

    /**
     * extra files from $RECIPE_DIR
     */
    recipe?: string | string[];
  };
}

export interface ImportTestElement {
  /**
   * A list of Python imports to check after having installed the built package.
   */
  imports: string | string[];
}

export interface DownstreamTestElement {
  /**
   * Install the package and use the output of this package to test if
   * the tests in the downstream package still succeed.
   */
  downstream: string;
}

export type Test = XOR<
  CommandTestElement,
  ImportTestElement,
  DownstreamTestElement
>;
