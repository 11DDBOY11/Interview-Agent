import prompts

with open("../PROMPTS.md", "w") as f:
    f.write("# AI Interview Agent Prompts\n\n")
    f.write("This file is auto-generated from `backend/prompts.py`.\n\n")

    def write_prompt(name, sys_prompt, user_prompt):
        f.write(f"## {name}\n\n")
        f.write("### SYSTEM\n```text\n")
        f.write(sys_prompt.strip() + "\n```\n\n")
        f.write("### USER\n```text\n")
        f.write(user_prompt.strip() + "\n```\n\n")

    write_prompt("1. Question Generator", prompts.QUESTION_GENERATOR_SYSTEM, prompts.QUESTION_GENERATOR_USER)
    write_prompt("2. Judgment Classifier", prompts.JUDGMENT_CLASSIFIER_SYSTEM, prompts.JUDGMENT_CLASSIFIER_USER)
    write_prompt("3. Follow-up / Reframe Generator", prompts.FOLLOWUP_GENERATOR_SYSTEM, prompts.FOLLOWUP_GENERATOR_USER)
    write_prompt("4. Feedback Synthesizer", prompts.FEEDBACK_SYNTHESIZER_SYSTEM, prompts.FEEDBACK_SYNTHESIZER_USER)
    write_prompt("5. Opening Message", prompts.OPENING_SYSTEM, prompts.OPENING_USER)

print("PROMPTS.md updated.")
