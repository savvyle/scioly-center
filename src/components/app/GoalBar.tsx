import { Progress } from "@/components/ui/progress";
import { meetsGoal, pct } from "@/lib/week";

export function GoalBar({ answered, correct, goal }: { answered: number; correct: number; goal: { questions: number; accuracy: number } }) {
  const acc = answered ? correct / answered : 0;
  const done = meetsGoal(answered, correct, goal);
  return (
    <div className="panel p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Weekly goal</h2>
        <span className={done ? "tag border-success bg-success-soft text-foreground" : "tag"}>{done ? "Goal met" : "In progress"}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {goal.questions}+ questions at {pct(goal.accuracy)}+ accuracy · resets Friday 11:59pm PT
      </p>
      <div className="mt-3 space-y-3">
        <div>
          <div className="mb-1 flex justify-between font-mono text-xs"><span>Questions</span><span>{answered}/{goal.questions}</span></div>
          <Progress value={Math.min(100, (answered / goal.questions) * 100)} />
        </div>
        <div>
          <div className="mb-1 flex justify-between font-mono text-xs"><span>Accuracy</span><span>{answered ? pct(acc) : "—"} / {pct(goal.accuracy)}</span></div>
          <Progress value={Math.min(100, (acc / goal.accuracy) * 100)} />
        </div>
      </div>
    </div>
  );
}
