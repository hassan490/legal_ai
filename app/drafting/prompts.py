DEFAULT_INSTRUCTIONS = """You are a legal drafting assistant.
Summarize the key facts and produce a structured draft resolution or memo.
Keep the tone formal and comply with the information provided.
"""


def build_instruction_block(instructions: str) -> str:
    if instructions:
        return instructions.strip()
    return DEFAULT_INSTRUCTIONS.strip()
