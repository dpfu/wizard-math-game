export default class QuestionGenerator {
    /**
     * Generates a math question based on the provided configuration.
     * @param {object} config - The configuration object.
     * @param {number} config.difficulty - Difficulty level (0: Easy, 1: Normal, 2: Hard).
     * @param {string[]} config.selectedOperators - Array of operators like ['⋅', '+', '-', ':'].
     * @param {number[]} config.selectedTables - Array of numbers for multiplication/division tables.
     * @param {boolean} config.allowEasyMultiplication - Whether to allow 1 as a factor in multiplication.
     * @returns {object|null} A question object { num1, num2, operator, answer } or null if no question can be generated.
     */
    static generate(config) {
        const { difficulty, selectedOperators, selectedTables, allowEasyMultiplication } = config;

        if (!selectedOperators || selectedOperators.length === 0) {
            console.error("QuestionGenerator: No operators selected!");
            return null;
        }

        const operatorSymbol = Phaser.Math.RND.pick(selectedOperators);
        let questionData;

        switch (operatorSymbol) {
            case '⋅':
                questionData = this.generateMultiplication(difficulty, selectedTables, allowEasyMultiplication);
                break;
            case ':':
                // Pass allowEasyMultiplication as it might influence factor choice (e.g. allowing 1 as a factor)
                questionData = this.generateDivision(difficulty, selectedTables, allowEasyMultiplication);
                break;
            case '+':
                questionData = this.generateAddition(difficulty);
                break;
            case '-':
                questionData = this.generateSubtraction(difficulty);
                break;
            default:
                console.error(`QuestionGenerator: Unknown operator: ${operatorSymbol}`);
                questionData = { num1: 1, num2: 1, answer: 2 }; // Fallback
                return { ...questionData, operator: '+' }; // Return a valid fallback with a known operator
        }

        return { ...questionData, operator: operatorSymbol };
    }

    /**
     * Determines the range for the second factor/other factor based on difficulty and context.
     * @param {number} difficulty - The difficulty level.
     * @param {boolean} allowOneAsFactor - Whether '1' is allowed as a factor in this context.
     * @returns {number[]} An array of possible numbers for the factor.
     */
    static getFactorRange(difficulty, allowOneAsFactor) {
        let range;
        switch (difficulty) {
            case 0: // Easy
                range = [1, 2, 3, 4, 5, 10];
                if (!allowOneAsFactor) range = range.filter(n => n !== 1);
                if (range.length === 0) range = [2, 3, 4, 5].filter(n => n <= 5); // Fallback if only 1 was removed
                if (range.length === 0) range = [2]; // Ultimate fallback
                break;
            case 2: // Hard
                range = Array.from({ length: 10 }, (_, i) => i + 1); // 1-10
                // Specific hard logic (e.g. preferring larger numbers) handled in calling functions.
                break;
            case 1: // Normal
            default:
                range = Array.from({ length: 10 }, (_, i) => i + 1); // 1-10
                break;
        }
        return range;
    }

    static generateMultiplication(difficulty, selectedTables, allowEasyMultiplication) {
        if (!selectedTables || selectedTables.length === 0) {
            return { num1: 2, num2: 2, answer: 4 }; // Default
        }

        let num1 = Phaser.Math.RND.pick(selectedTables);
        // allowEasyMultiplication for context: true if global easy mult is on OR 1 is a selected table
        const factor2Range = this.getFactorRange(difficulty, allowEasyMultiplication || selectedTables.includes(1));
        let num2 = Phaser.Math.RND.pick(factor2Range);

        if (difficulty === 0) { // Easy
            if (Math.random() < 0.5 && (allowEasyMultiplication || selectedTables.includes(1))) {
                if (Math.random() < 0.5 && selectedTables.includes(1)) num1 = 1;
                else if (factor2Range.includes(1)) num2 = 1;
            } else if (num1 > 5 && num2 > 5 && factor2Range.some(n => n <=3)) { // If both are large for easy
                num2 = Phaser.Math.RND.pick(factor2Range.filter(n => n <= 3 && (allowEasyMultiplication || n !== 1)));
            }
        } else if (difficulty === 2) { // Hard
            if (!allowEasyMultiplication) {
                if (num1 === 1 && selectedTables.filter(t => t !== 1).length > 0) {
                    num1 = Phaser.Math.RND.pick(selectedTables.filter(t => t !== 1));
                }
                if (num2 === 1 && factor2Range.filter(n => n !== 1).length > 0) {
                    num2 = Phaser.Math.RND.pick(factor2Range.filter(n => n !== 1));
                }
            }
            if (num1 <= 5 && num2 <= 5) { // Try for at least one larger factor
                const largerTables = selectedTables.filter(t => t > 5);
                const largerFactors2 = factor2Range.filter(f => f > 5);
                if (Math.random() < 0.5 && largerTables.length > 0) {
                    num1 = Phaser.Math.RND.pick(largerTables);
                } else if (largerFactors2.length > 0) {
                    num2 = Phaser.Math.RND.pick(largerFactors2);
                }
            }
        } else { // Normal (difficulty 1)
            if (!allowEasyMultiplication) {
                if (num1 === 1 && selectedTables.filter(t => t !== 1).length > 0) {
                    num1 = Phaser.Math.RND.pick(selectedTables.filter(t => t !== 1));
                }
                if (num2 === 1 && num1 !== 1 && factor2Range.filter(n => n !== 1).length > 0) {
                    num2 = Phaser.Math.RND.pick(factor2Range.filter(n => n !== 1));
                }
            }
        }
        if (!selectedTables.includes(num1)) num1 = Phaser.Math.RND.pick(selectedTables); // Ensure num1 is valid
        if (!factor2Range.includes(num2)) num2 = Phaser.Math.RND.pick(factor2Range); // Ensure num2 is valid

        return { num1, num2, answer: num1 * num2 };
    }

    static generateDivision(difficulty, selectedTables, allowEasyMultiplication) {
        if (!selectedTables || selectedTables.length === 0) {
            return { num1: 4, num2: 2, answer: 2 }; // Default
        }

        let factorFromTable = Phaser.Math.RND.pick(selectedTables);
        const otherFactorRange = this.getFactorRange(difficulty, allowEasyMultiplication || selectedTables.includes(1));
        let otherFactor = Phaser.Math.RND.pick(otherFactorRange);
        if (otherFactor === 0) otherFactor = 1; // Safety: otherFactor cannot be 0

        // Apply difficulty adjustments similar to multiplication
        if (difficulty === 0) {
            if (Math.random() < 0.5 && (allowEasyMultiplication || selectedTables.includes(1))) {
                if (Math.random() < 0.5 && selectedTables.includes(1)) factorFromTable = 1;
                else if (otherFactorRange.includes(1)) otherFactor = 1;
            }
        } else if (difficulty === 2) {
            if (!allowEasyMultiplication) {
                if (factorFromTable === 1 && selectedTables.filter(t => t !== 1).length > 0) {
                    factorFromTable = Phaser.Math.RND.pick(selectedTables.filter(t => t !== 1));
                }
                if (otherFactor === 1 && otherFactorRange.filter(n => n !== 1).length > 0) {
                    otherFactor = Phaser.Math.RND.pick(otherFactorRange.filter(n => n !== 1));
                }
            }
             if (factorFromTable <= 5 && otherFactor <= 5) { // Try for larger numbers
                const largerTables = selectedTables.filter(t => t > 5);
                const largerOtherFactors = otherFactorRange.filter(f => f > 5);
                if (Math.random() < 0.5 && largerTables.length > 0) {
                     factorFromTable = Phaser.Math.RND.pick(largerTables);
                } else if (largerOtherFactors.length > 0) {
                     otherFactor = Phaser.Math.RND.pick(largerOtherFactors);
                }
            }
        } else { // Normal
            if (!allowEasyMultiplication) {
                if (factorFromTable === 1 && selectedTables.filter(t => t !== 1).length > 0) {
                    factorFromTable = Phaser.Math.RND.pick(selectedTables.filter(t => t !== 1));
                }
                if (otherFactor === 1 && factorFromTable !== 1 && otherFactorRange.filter(n => n !== 1).length > 0) {
                    otherFactor = Phaser.Math.RND.pick(otherFactorRange.filter(n => n !== 1));
                }
            }
        }
        if (!selectedTables.includes(factorFromTable)) factorFromTable = Phaser.Math.RND.pick(selectedTables);
        if (!otherFactorRange.includes(otherFactor) || otherFactor === 0) {
             otherFactor = Phaser.Math.RND.pick(otherFactorRange.filter(n => n !== 0));
             if (otherFactor === undefined || otherFactor === 0) otherFactor = 1; // Ultimate safety
        }


        let dividend = factorFromTable * otherFactor;
        let num1, num2, answer;

        if (Phaser.Math.Between(0, 1) === 0) {
            num1 = dividend;
            num2 = factorFromTable;
            answer = otherFactor;
        } else {
            num1 = dividend;
            num2 = otherFactor;
            answer = factorFromTable;
        }
        
        if (num2 === 0) { // Critical Fallback if divisor is 0
            console.warn("QuestionGenerator (Division): Divisor was zero, attempting recovery.");
            if (factorFromTable !== 0) num2 = factorFromTable;
            else if (otherFactor !== 0) num2 = otherFactor; // Should be non-zero due to earlier check
            else num2 = 1; // Absolute fallback for divisor
            
            if (num2 === 0) num2 = 1; // Ensure divisor is not zero

            answer = dividend / num2;
            if (!Number.isInteger(answer) || num2 === 0) { // If still problematic
                 console.error("QuestionGenerator (Division): Unrecoverable division error. Defaulting.");
                 return { num1: 4, num2: 2, answer: 2 };
            }
        }

        return { num1, num2, answer };
    }

    static generateAddition(difficulty) {
        let num1, num2;
        switch (difficulty) {
            case 0: // Easy
                num1 = Phaser.Math.Between(1, 20);
                num2 = Phaser.Math.Between(0, 20);
                if (num1 + num2 > 25) { // Keep sum relatively small for easy
                    if (num1 > num2 && num1 > 10) num1 = Phaser.Math.Between(1, 10);
                    else if (num2 > 10) num2 = Phaser.Math.Between(0, 10);
                }
                break;
            case 2: // Hard
                num1 = Phaser.Math.Between(20, 100);
                num2 = Phaser.Math.Between(20, 99); // Encourage two 'larger' numbers
                break;
            case 1: // Normal
            default:
                num1 = Phaser.Math.Between(1, 100);
                num2 = Phaser.Math.Between(0, 99);
                break;
        }
        return { num1, num2, answer: num1 + num2 };
    }

    static generateSubtraction(difficulty) {
        let num1, num2;
        switch (difficulty) {
            case 0: // Easy
                num1 = Phaser.Math.Between(1, 25);
                num2 = Phaser.Math.Between(0, num1);
                if (num1 - num2 > 15 && num1 > 15) { // Keep difference relatively small
                     num2 = Phaser.Math.Between(Math.max(0, num1 - 15), num1);
                }
                break;
            case 2: // Hard
                num1 = Phaser.Math.Between(25, 100);
                num2 = Phaser.Math.Between(10, num1);
                if (num1 - num2 < 10 && num1 > 20) { // Ensure difference is not too trivial
                    num2 = Phaser.Math.Between(Math.max(0, num1 - 50), Math.max(0, num1 - 11));
                }
                break;
            case 1: // Normal
            default:
                num1 = Phaser.Math.Between(1, 100);
                num2 = Phaser.Math.Between(0, num1);
                break;
        }
        // Ensure num2 is not negative after adjustments
        if (num2 < 0) num2 = 0;
        // Ensure num1 is still greater than or equal to num2
        if (num1 < num2) num1 = num2 + Phaser.Math.Between(0,10);


        return { num1, num2, answer: num1 - num2 };
    }
}
