export function registerRaceTools(race, sync) {
  const context = document.modelContext;
  if (!context?.registerTool) return () => {};
  const lifecycle = new AbortController();
  const tools = [
    {
      name: 'get_race_status',
      title: 'Read race status',
      description:
        'Read current race mode, lap, position, time and boost energy.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true },
      execute(input) {
        if (!input || typeof input !== 'object' || Object.keys(input).length)
          throw new Error('Expected an empty object.');
        return race.snapshot();
      },
    },
    {
      name: 'control_race_session',
      title: 'Control race session',
      description:
        'Start a new race, pause the current race, resume it, or return to the hangar. Starting resets current progress.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['start', 'pause', 'resume', 'menu'],
          },
        },
        required: ['action'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false },
      execute(input) {
        if (
          !input ||
          Object.keys(input).length !== 1 ||
          !['start', 'pause', 'resume', 'menu'].includes(input.action)
        )
          throw new Error('Choose start, pause, resume or menu.');
        if (input.action === 'resume' && race.mode !== 'paused')
          throw new Error('The race is not paused.');
        race[input.action]();
        sync();
        return race.snapshot();
      },
    },
  ];
  for (const tool of tools) {
    try {
      Promise.resolve(
        context.registerTool(tool, { signal: lifecycle.signal }),
      ).catch(() => {});
    } catch {
      /* The game works in browsers without this optional API. */
    }
  }
  return () => lifecycle.abort();
}
