/**
 * Methods of this class will be injected in the SUT to
 * keep track of what the tests do execute/cover.
 */
import TargetInfo from "../TargetInfo";
import Action from "../Action";
import ObjectiveNaming from "../ObjectiveNaming";
import AdditionalInfo from "../AdditionalInfo";
import ObjectiveRecorder from "./ObjectiveRecorder";
import Truthness from "../heuristic/Truthness";
import HeuristicsForBooleans from "../heuristic/HeuristicsForBooleans";
import {ReplacementType} from "../methodreplacement/ReplacementType";

export default class ExecutionTracer {

    /**
     * Key -> the unique descriptive id of the coverage objective
     */
    private static readonly objectiveCoverage: Map<string, TargetInfo> = new Map<string, TargetInfo>();

    /**
     * A test case can be composed by 1 or more actions, eg HTTP calls.
     * When we get the best distance for a testing target, we might
     * also want to know which action in the test led to it.
     */
    private static actionIndex: number = 0;

    /**
     * A set of possible values used in the tests, needed for some kinds
     * of taint analyses
     */
    private static inputVariables: Set<string> = new Set();

    /**
     * Besides code coverage, there might be other events that we want to
     * keep track during test execution.
     * We keep track of it separately for each action
     */
    private static readonly additionalInfoList: Array<AdditionalInfo> = [];


    static reset() {
        ExecutionTracer.objectiveCoverage.clear();
        ExecutionTracer.actionIndex = 0;
        ExecutionTracer.additionalInfoList.length = 0;
        ExecutionTracer.additionalInfoList.push(new AdditionalInfo());
        ExecutionTracer.inputVariables = new Set();
    }


    static setAction(action: Action) {
        if (action.getIndex() != ExecutionTracer.actionIndex) {
            ExecutionTracer.actionIndex = action.getIndex();
            ExecutionTracer.additionalInfoList.push(new AdditionalInfo());
        }

        if (action.getInputVariables() && action.getInputVariables().size > 0) {
            ExecutionTracer.inputVariables = action.getInputVariables();
        }
    }

    /**
     * Check if the given input represented a tainted value from the test cases.
     * This could be based on static info of the input (eg, according to a precise
     * name convention given by TaintInputName), or dynamic info given directly by
     * the test itself (eg, the test at action can register a list of values to check
     * for)
     */
    // public static boolean isTaintInput(String input){
    //     return TaintInputName.isTaintInput(input) || inputVariables.contains(input);
    // }


    // public static TaintType getTaintType(String input){
    //
    //     if(input == null){
    //         return TaintType.NONE;
    //     }
    //
    //     if(isTaintInput(input)){
    //         return TaintType.FULL_MATCH;
    //     }
    //
    //     if(TaintInputName.includesTaintInput(input)
    //         || inputVariables.stream().anyMatch(v -> input.contains(v))){
    //         return TaintType.PARTIAL_MATCH;
    //     }
    //
    //     return TaintType.NONE;
    // }


    static exposeAdditionalInfoList(): Array<AdditionalInfo> {
        return ExecutionTracer.additionalInfoList;
    }

    // public static void addQueryParameter(String param){
    //     additionalInfoList.get(actionIndex).addQueryParameter(param);
    // }
    //
    // public static void addHeader(String header){
    //     additionalInfoList.get(actionIndex).addHeader(header);
    // }
    //
    // public static void addStringSpecialization(String taintInputName, StringSpecializationInfo info){
    //     additionalInfoList.get(actionIndex).addSpecialization(taintInputName, info);
    // }


    public static markLastExecutedStatement(lastLine: string) {

        /*
            There is a possible issue here: when there is an exception, there
            is no pop of the stmt. So, the "call-stack" until the exception will still
            be saved in this stack, even if computation continues (eg after a try/catch).
            This is possibly a memory leak
         */

        ExecutionTracer.additionalInfoList[ExecutionTracer.actionIndex]
            .pushLastExecutedStatement(lastLine);
    }


    public static completedLastExecutedStatement(lastLine: string) {
        const stmt = ExecutionTracer.additionalInfoList[ExecutionTracer.actionIndex].popLastExecutedStatement();
        if (stmt !== lastLine) {
            throw Error(`Expected to pop ${lastLine} instead of ${stmt}`);
        }
    }

    public static getInternalReferenceToObjectiveCoverage(): Map<String, TargetInfo> {
        return ExecutionTracer.objectiveCoverage;
    }

    /**
     * @return the number of objectives that have been encountered
     * during the test execution
     */
    public static getNumberOfObjectives(prefix?: string): number {

        if (!prefix) {
            return ExecutionTracer.objectiveCoverage.size;
        }

        return Array.from(ExecutionTracer.objectiveCoverage.keys())
            .filter(e => e.startsWith(prefix))
            .length;
    }

    /**
     * Note: only the objectives encountered so far can have
     * been recorded. So, this is a relative value, not based
     * on the code of the whole SUT (just the parts executed so far).
     * Therefore, it is quite useless for binary values (ie 0 or 1),
     * like current implementation of basic line coverage.
     *
     * @param prefix used for string matching of which objectives types
     *               to consider, eg only lines or only branches.
     *               Use "" or {@code null} to pick up everything
     * @return
     */
    public static getNumberOfNonCoveredObjectives(prefix: string): number {

        return ExecutionTracer.getNonCoveredObjectives(prefix).size;
    }

    public static getNonCoveredObjectives(prefix: string): Set<string> {

        return new Set(Array.from(ExecutionTracer.objectiveCoverage.entries())
            .filter(e => !prefix || e[0].startsWith(prefix))
            .filter(e => e[1].value < 1)
            .map(e => e[0])
        );
    }

    public static getValue(id: string): number {
        return ExecutionTracer.objectiveCoverage.get(id).value;
    }

    private static updateObjective(id: string, value: number) {
        if (value < 0 || value > 1) {
            throw new Error("Invalid value " + value + " out of range [0,1]");
        }

        /*
            In the same execution, a target could be reached several times,
            so we should keep track of the best value found so far
         */
        if (ExecutionTracer.objectiveCoverage.has(id)) {
            let previous = ExecutionTracer.objectiveCoverage.get(id).value;
            if (value > previous) {
                ExecutionTracer.objectiveCoverage.set(id, new TargetInfo(null, id, value, ExecutionTracer.actionIndex));
            }
        } else {
            ExecutionTracer.objectiveCoverage.set(id, new TargetInfo(null, id, value, ExecutionTracer.actionIndex));
        }

        ObjectiveRecorder.update(id, value);
    }

    public static executedReplacedMethod(idTemplate: string, type: ReplacementType, t: Truthness) {

        const idTrue = ObjectiveNaming.methodReplacementObjectiveName(idTemplate, true, type);
        const idFalse = ObjectiveNaming.methodReplacementObjectiveName(idTemplate, false, type);

        ExecutionTracer.updateObjective(idTrue, t.getOfTrue());
        ExecutionTracer.updateObjective(idFalse, t.getOfFalse());
    }


    /**
     *
     * WARNING: here we do differently from Java, as we can not rely on reflection
     * to get unique id for methods.
     *
     * We rather do "statement" coverage, and have a further id for it.
     */
    public static enteringStatement(fileName: string, line: number, statementId: number) {

        const lineId = ObjectiveNaming.lineObjectiveName(fileName, line);
        const fileId = ObjectiveNaming.fileObjectiveName(fileName);
        const stmtId = ObjectiveNaming.statementObjectiveName(fileName, line, statementId);
        ExecutionTracer.updateObjective(lineId, 1);
        ExecutionTracer.updateObjective(fileId, 1);
        ExecutionTracer.updateObjective(stmtId, 0.5);


        const lastLine = fileName + "_" + line + "_" + statementId;

        ExecutionTracer.markLastExecutedStatement(lastLine);
    }

    public static completedStatement(fileName: string, line: number, statementId: number) {

        const stmtId = ObjectiveNaming.statementObjectiveName(fileName, line, statementId);
        ExecutionTracer.updateObjective(stmtId, 1);

        const lastLine = fileName + "_" + line + "_" + statementId;

        ExecutionTracer.completedLastExecutedStatement(lastLine);

        HeuristicsForBooleans.clearLastEvaluation();
    }


    /**
     *  Report on whether method calls have been successfully completed.
     *  Failures can happen due to thrown exceptions.
     *
     * @param fileName
     * @param line
     * @param index    as there can be many method calls on same line, need to differentiate them
     * @param completed whether the method call was successfully completed.
     */
    public static executingMethod(fileName: string, line: number, index: number, completed: boolean) {
        const id = ObjectiveNaming.successCallObjectiveName(fileName, line, index);
        if (completed) {
            ExecutionTracer.updateObjective(id, 1);
        } else {
            ExecutionTracer.updateObjective(id, 0.5);
        }
    }


    public static updateBranch(fileName: string, line: number, branchId: number, t: Truthness) {

        const forThen = ObjectiveNaming.branchObjectiveName(fileName, line, branchId, true);
        const forElse = ObjectiveNaming.branchObjectiveName(fileName, line, branchId, false);

        ExecutionTracer.updateObjective(forThen, t.getOfTrue());
        ExecutionTracer.updateObjective(forElse, t.getOfFalse());
    }
}


ExecutionTracer.reset();