# LM Studio Qwen Compatibility Debug Record

## Initial failure

A newer Qwen chat template rejected the LM Studio Call 1 request when it
contained multiple system messages:

```text
System message must be at the beginning
```

The compatibility fix is to merge the evaluator instructions and canonical
data into one `system` message while preserving the learner submission as a
separate `user` message.

## Investigation notes

- **Thinking mode:** LM Studio/Qwen initially produced `reasoning_content`
  without usable final `content`. Thinking could be disabled through the LM
  Studio model configuration. FRL did not add a reasoning-output fallback.
- **Token budget:** Increasing the LM Studio output budget did not fix the
  browser failure. A later direct Qwen3.8 diagnosis succeeded with 268 output
  tokens.
- **Timeout:** LM Studio logged `Client disconnected. Stopping generation...`
  during the browser path. Direct execution through
  `scripts/smokeLmStudioDiagnosis.mjs` succeeded with Qwen3.8 in approximately
  52.5 seconds. This showed that the model pipeline worked and that the
  browser/Netlify execution boundary was the limiting factor.

## Conclusion

The code hotfix is limited to serializing the two system-level inputs as one
system message. Slow local models may exceed the Netlify synchronous Function
execution window. Redesigning the local runtime path is outside this hotfix.
