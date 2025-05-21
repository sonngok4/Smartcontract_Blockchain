module.exports = {
    skipFiles: ['Migrations.sol'],
    silent: false,
    measureStatementCoverage: true,
    measureFunctionCoverage: true,
    measureBranchCoverage: true,
    measureModifierCoverage: true,
    configureYulOptimizer: true,
    solcOptimizerDetails: {
      peephole: false,
      jumpdestRemover: false,
      orderLiterals: false,
      deduplicate: false,
      cse: false,
      constantOptimizer: false,
      yul: false
    }
  };