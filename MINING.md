# Data-mining reports

## Mongo aggregation frameworks

Match a sandbox

```
{
  $match: {
    $sandbox: <sandbox id value>
  }
}
```


Project sampled fileds

```
{
  $project: {
    commit: 1, 
    passed: {
      $cond: [ "$raw.passed", 1, 0 ]
    },
    browser: {
      $concat: [ "$agent.family", "$agent.major" ]
    }
  }
}

```

Group

```
{
  $group: {
    _id: {
      commit: "$commit",
      browser: "$browser"
    },
    all: {
      $sum: 1
    },
    ok: {
      $sum:"passed"
    }
  }
}
```