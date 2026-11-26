"use strict";
const INTERVIEW_PRO_BANK = [
  {
    "id": "K8S-001",
    "topic": "Kubernetes",
    "section": "architecture",
    "level": "middle",
    "question": "Как scheduler выбирает узел для нового Pod?",
    "answer": "Scheduler наблюдает за Pod без назначенного узла, фильтрует неподходящие узлы и оценивает оставшиеся. Учитываются requests, affinity, taints и другие ограничения. После выбора binding записывается через API; контейнеры запускает kubelet, не scheduler.",
    "follow_up": "Почему свободный CPU по kubectl top не гарантирует размещение? Что произойдёт при отсутствии кандидатов?",
    "practice": "kubectl describe pod; события FailedScheduling; проверка allocatable и уже запрошенных ресурсов.",
    "rubric": "Не считать scheduler агентом запуска контейнеров; объяснить фильтрацию, scoring, binding и роль kubelet.",
    "source": "https://kubernetes.io/docs/concepts/scheduling-eviction/kube-scheduler/"
  },
  {
    "id": "K8S-002",
    "topic": "Kubernetes",
    "section": "architecture",
    "level": "senior",
    "question": "Что происходит с запущенными приложениями при временной недоступности API server?",
    "answer": "Уже запущенные контейнеры обычно продолжают работать, поскольку kubelet и сетевой dataplane имеют локальное состояние. Но изменения конфигураций, scheduling, обновления endpoint и восстановление некоторых отказов могут задержаться. Проверять отдельно доступность API и пользовательский трафик; восстановление зависит от причины и реализации компонентов.",
    "follow_up": "Что изменится, если одновременно упадёт узел? Почему health API не равен health приложения?",
    "practice": "Проверить /readyz API, kubelet, состояние dataplane и клиентские SLI отдельно.",
    "rubric": "Различать control plane и data plane; не обещать бесконечную автономность.",
    "source": "https://kubernetes.io/docs/concepts/architecture/"
  },
  {
    "id": "K8S-003",
    "topic": "Kubernetes",
    "section": "architecture",
    "level": "senior",
    "question": "Как контроллер Kubernetes понимает, что объект необходимо изменить?",
    "answer": "Контроллер наблюдает за объектами через API, сравнивает фактическое состояние с желаемым и выполняет операции для сближения. Reconciliation повторяется при событиях и/или повторной синхронизации. Операции должны выдерживать повторное выполнение, устаревшие чтения и конфликтующие обновления.",
    "follow_up": "Почему успешный kubectl apply ещё не означает готовность? Как использовать status.conditions?",
    "practice": "Сопоставить spec, metadata.generation, status.observedGeneration (где поддерживается) и conditions.",
    "rubric": "Не считать API синхронным исполнителем; объяснить eventual reconciliation.",
    "source": "https://kubernetes.io/docs/concepts/architecture/controller/"
  },
  {
    "id": "K8S-004",
    "topic": "Kubernetes",
    "section": "architecture",
    "level": "lead",
    "question": "Почему один etcd в кластере с тремя API server не обеспечивает HA?",
    "answer": "API server хранит состояние Kubernetes в etcd; несколько API server устраняют часть отказов API, но не отказ единственного хранилища. Для HA нужен кворум etcd в независимых доменах отказа, резервные копии и проверенный restore. Отдельно проектируются доступность endpoint API, сеть и балансировщик.",
    "follow_up": "Что случится при потере большинства etcd? Почему snapshot не заменяет HA?",
    "practice": "Проверять etcd health, latency, quorum, состояние API /readyz и восстановление на отдельном стенде.",
    "rubric": "Отличать репликацию, кворум, доступность API и DR; не обещать нулевой RPO.",
    "source": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/"
  },
  {
    "id": "K8S-005",
    "topic": "Kubernetes",
    "section": "architecture",
    "level": "senior",
    "question": "Чем finalizer отличается от ownerReference?",
    "answer": "Finalizer удерживает объект в состоянии удаления, пока ответственный контроллер не завершит очистку и не снимет маркер. ownerReference описывает отношение владения, которое garbage collector использует для каскадного удаления. Зависший finalizer требует анализа контроллера и внешних ресурсов, а не немедленного удаления записи.",
    "follow_up": "Что означает deletionTimestamp? Чем опасно принудительно снять finalizer у PVC?",
    "practice": "kubectl get OBJECT NAME -o yaml; проверить metadata.finalizers, ownerReferences, события контроллера.",
    "rubric": "Различать блокировку удаления и владение; проверять последствия для внешних ресурсов.",
    "source": "https://kubernetes.io/docs/concepts/overview/working-with-objects/finalizers/"
  },
  {
    "id": "K8S-006",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "middle",
    "question": "Когда выбирать DaemonSet вместо Deployment?",
    "answer": "DaemonSet поддерживает экземпляр Pod на каждом подходящем узле: типичный пример — агент логов или сетевой плагин. Deployment поддерживает заданное число взаимозаменяемых реплик, независимо от числа узлов. Для DaemonSet важно учитывать node selectors, tolerations и стратегию обновления.",
    "follow_up": "Что произойдёт при добавлении узла? Как исключить неподходящие узлы?",
    "practice": "kubectl get daemonset; сравнить DESIRED, CURRENT, READY; проверить labels и taints узлов.",
    "rubric": "Объяснить привязку к узлам, а не фиксированному числу реплик.",
    "source": "https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/",
    "source_prompts": [
      {
        "number": 26,
        "question": "Deployment и DaemonSet, две сущности кубера, в чем разница? Какая для чего в большей степени используется?"
      },
      {
        "number": 29,
        "question": "DaemonSet что это и его практическое использование? И есть ли реплики у DaemonSet?"
      },
      {
        "number": 30,
        "question": "Что такое DaemonSet, для чего используется?"
      }
    ]
  },
  {
    "id": "K8S-007",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "middle",
    "question": "Когда приложению нужен StatefulSet, а когда достаточно Deployment с PVC?",
    "answer": "StatefulSet даёт устойчивые ordinal-имена Pod и связь отдельных реплик с томами, поддерживает порядок операций по умолчанию. Это полезно при адресуемых участниках кластера БД. Одна stateless реплика с отдельным общим хранилищем не обязательно требует StatefulSet; выбор зависит от идентичности, доступа к данным и поведения приложения.",
    "follow_up": "Почему три реплики StatefulSet не создают репликацию БД? Как влияет podManagementPolicy?",
    "practice": "Проверить DNS, имена Pod и PVC, требования протокола репликации.",
    "rubric": "Не путать оркестрацию с консенсусом или репликацией приложения.",
    "source": "https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/",
    "source_prompts": [
      {
        "number": 31,
        "question": "StatefulSet в Kubernetes: что такое, зачем надо и его особенности?"
      },
      {
        "number": 32,
        "question": "Для какого приложения станешь использовать StatefulSet и почему? Почему делают StatefulSet, а не Deployment?"
      },
      {
        "number": 33,
        "question": "Чем отличается Deployment и StatefulSet?"
      },
      {
        "number": 47,
        "question": "Расскажи про разницу между PV, PVC и StatefulSet."
      }
    ]
  },
  {
    "id": "K8S-008",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "senior",
    "question": "Как ограничить число повторных попыток Kubernetes Job?",
    "answer": "Job поддерживает завершение заданного числа успешных задач, а backoffLimit ограничивает повторы при отказах в соответствии с политикой Job. activeDeadlineSeconds ограничивает общую продолжительность выполнения. Обрабатывай частично совершённые операции идемпотентно: рестарт не гарантирует отсутствие повторной обработки.",
    "follow_up": "Чем restartPolicy Never отличается от OnFailure для Job? Что делать с частично выполненной транзакцией?",
    "practice": "kubectl describe job; проверить conditions, failed/succeeded, logs созданных Pod.",
    "rubric": "Объяснить deadline, backoff и семантику побочных эффектов.",
    "source": "https://kubernetes.io/docs/concepts/workloads/controllers/job/",
    "source_prompts": [
      {
        "number": 35,
        "question": "Что такое Job?"
      }
    ]
  },
  {
    "id": "K8S-009",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "senior",
    "question": "Как избежать наложения запусков одного CronJob?",
    "answer": "concurrencyPolicy Forbid не запускает новую Job, если предыдущая Job этого CronJob ещё выполняется. Replace заменяет прежнюю Job, Allow разрешает параллелизм. Это не глобальный mutex для других CronJob и не exactly-once: бизнес-операции требуют собственной защиты.",
    "follow_up": "Что будет с долгой задачей при Forbid? Зачем startingDeadlineSeconds?",
    "practice": "Проверить расписание, active Jobs, history limits и идемпотентность операций.",
    "rubric": "Назвать область действия concurrencyPolicy и ограничения гарантий планирования.",
    "source": "https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/",
    "source_prompts": [
      {
        "number": 36,
        "question": "Какой ресурс создает Job?"
      }
    ]
  },
  {
    "id": "K8S-010",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "senior",
    "question": "Зачем нужен startup probe для медленно стартующего приложения?",
    "answer": "Startup probe даёт приложению время на инициализацию: liveness и readiness не выполняются до его успеха. Если startup probe исчерпает порог ошибок, kubelet завершит контейнер согласно правилам рестарта. Это позволяет не растягивать liveness на весь жизненный цикл ради редкого долгого старта.",
    "follow_up": "Как выбрать failureThreshold и periodSeconds? Почему большой initialDelaySeconds хуже адаптируется?",
    "practice": "Наблюдать время старта, события Unhealthy, рестарты и readiness после старта.",
    "rubric": "Объяснить различие startup, readiness и liveness; настроить порог по измерениям.",
    "source": "https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/"
  },
  {
    "id": "K8S-011",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "senior",
    "question": "Как корректно завершить HTTP-сервис при rolling update?",
    "answer": "При удалении Pod запускается termination flow, а endpoints обновляются независимо. Приложение должно прекращать принимать новые запросы и завершать существующие в пределах terminationGracePeriodSeconds; preStop может помочь согласовать drain, но входит в общий grace period. Проверять реальные ошибки и задержки, а не только исчезновение Pod.",
    "follow_up": "Что делать с длинными соединениями? Почему sleep в preStop не даёт гарантии?",
    "practice": "Нагрузочный тест во время rollout; наблюдать ответы клиента, SIGTERM и завершение соединений.",
    "rubric": "Учитывать гонку маршрутизации, grace period и application-level drain.",
    "source": "https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/"
  },
  {
    "id": "K8S-012",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "middle",
    "question": "Почему изменение ConfigMap не всегда обновляет конфигурацию приложения?",
    "answer": "Значения, переданные как environment variables, остаются прежними до пересоздания контейнера. Файлы ConfigMap в обычном volume обновляются с задержкой, но приложение должно перечитать их; subPath mount автоматического обновления не получает. Выбирай явную стратегию reload или rollout и проверяй версию конфигурации.",
    "follow_up": "Как избежать частичного применения новой конфигурации? Как использовать checksum annotation в Helm?",
    "practice": "Сравнить env и mounted file, проверить версию конфигурации приложения после изменения.",
    "rubric": "Различать env, volume, subPath и reload.",
    "source": "https://kubernetes.io/docs/concepts/configuration/configmap/"
  },
  {
    "id": "K8S-013",
    "topic": "Kubernetes",
    "section": "scheduling",
    "level": "senior",
    "question": "Как рассчитать число Pod, помещающихся на узле с allocatable 6 CPU и 12 GiB?",
    "answer": "Если каждый Pod запрашивает 750m CPU и 2 GiB, CPU допускает 8, память — 6, значит максимум 6 по этим двум ресурсам при отсутствии других потребителей. В реальности вычитают requests существующих Pod, DaemonSet и учитывают дополнительные ограничения, включая overhead, число Pod и topology.",
    "follow_up": "Что изменится, если фактическое потребление вдвое меньше requests? Почему limits не заменяют requests?",
    "practice": "Проверить kubectl describe node и requests всех контейнеров; воспроизвести FailedScheduling на стенде.",
    "rubric": "Рассчитать минимум по измерениям; отличать allocatable, requests и фактическое usage.",
    "source": "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/"
  },
  {
    "id": "K8S-014",
    "topic": "Kubernetes",
    "section": "scheduling",
    "level": "senior",
    "question": "Как CPU limit способен увеличить latency без высокой загрузки всего узла?",
    "answer": "CPU limit ограничивает процессорное время контейнера через механизм cgroup CPU bandwidth. При исчерпании квоты контейнер может ждать очередного периода, даже если на узле ещё есть CPU. Сопоставляй задержки приложения, throttling и нагрузку; корректируй limit только с учётом fairness, capacity и тестов.",
    "follow_up": "Почему kubectl top недостаточно? Что изменится при отсутствии CPU limit?",
    "practice": "Сравнить container_cpu_cfs_throttled_periods_total и container_cpu_cfs_periods_total при доступности этих метрик; проверить cgroup и p99.",
    "rubric": "Отличать throttling от node saturation; не объявлять отсутствие limit универсальным решением.",
    "source": "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/"
  },
  {
    "id": "K8S-015",
    "topic": "Kubernetes",
    "section": "scheduling",
    "level": "senior",
    "question": "Что такое QoS классы Guaranteed, Burstable и BestEffort?",
    "answer": "Класс зависит от заданных CPU/memory requests и limits контейнеров Pod. В обычной конфигурации Guaranteed требует положительных и равных CPU и memory request/limit для каждого контейнера, BestEffort не задаёт их, остальные относятся к Burstable. При node-pressure eviction учитываются также priority и превышение requests, поэтому Guaranteed не означает абсолютную защиту.",
    "follow_up": "Может ли Guaranteed Pod быть evicted? Как QoS связан с memory OOM?",
    "practice": "kubectl get pod -o jsonpath='{.status.qosClass}'; проверить node conditions и reason termination.",
    "rubric": "Назвать условия классов и не смешивать eviction, OOM и preemption.",
    "source": "https://kubernetes.io/docs/concepts/workloads/pods/pod-qos/",
    "source_prompts": [
      {
        "number": 76,
        "question": "Какие есть ограничения ресурсов в кубе (QoS)?"
      }
    ]
  },
  {
    "id": "K8S-016",
    "topic": "Kubernetes",
    "section": "scheduling",
    "level": "middle",
    "question": "Чем taint отличается от node affinity?",
    "answer": "Taint отталкивает Pod, если он не имеет подходящей toleration; toleration сама по себе не заставляет Pod выбрать узел. Node affinity ограничивает или предпочитает узлы по labels. Для выделенного пула обычно нужны taint и обязательная affinity одновременно.",
    "follow_up": "Чем NoSchedule отличается от NoExecute? Как запретить случайное размещение на обычных узлах?",
    "practice": "kubectl describe node; сравнить taints, tolerations, required nodeAffinity и events.",
    "rubric": "Объяснить разрешение против требования; различить эффекты taint.",
    "source": "https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/",
    "source_prompts": [
      {
        "number": 13,
        "question": "Что такое taint?"
      },
      {
        "number": 90,
        "question": "Можно ли как-нибудь сделать так, чтобы поды всегда на определенную ноду попадали?"
      }
    ]
  },
  {
    "id": "K8S-017",
    "topic": "Kubernetes",
    "section": "scheduling",
    "level": "senior",
    "question": "Как распределить шесть реплик между тремя зонами без обязательной anti-affinity для каждой пары?",
    "answer": "Topology spread constraints задают topologyKey зоны, selector и допустимый maxSkew. При maxSkew=1 и подходящих трёх зонах можно стремиться к 2/2/2; DoNotSchedule запрещает размещение, нарушающее ограничение, ScheduleAnyway делает его предпочтением. Проверить capacity, labels и minDomains перед потерей зоны.",
    "follow_up": "Что произойдёт при недоступности зоны? Почему жёсткое ограничение может снизить доступность?",
    "practice": "Проверить labels topology.kubernetes.io/zone, распределение Pod и события scheduler.",
    "rubric": "Объяснить skew, hard/soft правила и компромисс между spread и capacity.",
    "source": "https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/"
  },
  {
    "id": "K8S-018",
    "topic": "Kubernetes",
    "section": "scheduling",
    "level": "lead",
    "question": "Почему PriorityClass не резервирует ресурсы для критичного приложения?",
    "answer": "Priority влияет на очередь и возможность вытеснения менее приоритетных Pod. Даже после preemption размещение может оставаться невозможным из-за affinity, taints, отсутствия подходящих ресурсов или задержки завершения жертв. Для критичного приложения нужны capacity headroom, корректные requests и план деградации.",
    "follow_up": "Почему preemptionPolicy Never может быть полезен? Защищает ли PDB от любой preemption?",
    "practice": "Проверить priorityClassName, nominatedNodeName и FailedScheduling; моделировать отказ ёмкости.",
    "rubric": "Различать приоритет и резервирование; учитывать ограничения и влияние на другие команды.",
    "source": "https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/"
  },
  {
    "id": "K8S-019",
    "topic": "Kubernetes",
    "section": "scheduling",
    "level": "lead",
    "question": "Почему PodDisruptionBudget не защищает приложение от всех отказов?",
    "answer": "PDB ограничивает добровольные eviction через Eviction API в соответствии с доступным бюджетом, например при drain. Он не гарантирует защиту от аварий узла, прямого удаления Pod или rolling update контроллера. Проверяй число здоровых реплик, независимые failure domains и поведение конкретной операции.",
    "follow_up": "Что будет с drain при одной реплике и minAvailable=1? Что делать с unhealthy Pod?",
    "practice": "kubectl get pdb; проверить disruptionsAllowed, healthy replicas и план drain в тестовом кластере.",
    "rubric": "Не обещать HA с PDB; различать voluntary и involuntary disruption.",
    "source": "https://kubernetes.io/docs/concepts/workloads/pods/disruptions/"
  },
  {
    "id": "K8S-020",
    "topic": "Kubernetes",
    "section": "network",
    "level": "middle",
    "question": "Чем port, targetPort и nodePort отличаются в Service?",
    "answer": "port — порт Service, targetPort — порт назначения на backend (число или имя), nodePort — порт на узлах для соответствующего Service типа NodePort или некоторых LoadBalancer. Приложение должно слушать правильный targetPort. Объявление containerPort само по себе не запускает слушатель.",
    "follow_up": "Что будет при неверном targetPort? Как работает именованный порт?",
    "practice": "kubectl get svc -o yaml; проверить EndpointSlice ports; проверить listener через ss или curl из диагностического Pod.",
    "rubric": "Различить три уровня адресации и фактический сокет приложения.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/service/"
  },
  {
    "id": "K8S-021",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Когда headless Service полезнее обычного ClusterIP?",
    "answer": "Headless Service с clusterIP: None не предоставляет обычный виртуальный IP балансировки. При наличии selector DNS возвращает адреса соответствующих backend Pod. Это полезно для обнаружения отдельных участников StatefulSet; клиенту требуется корректная стратегия выбора, DNS caching и повторов.",
    "follow_up": "Почему headless Service не заменяет discovery протокол БД? Как publishNotReadyAddresses меняет поведение?",
    "practice": "Проверить DNS A/AAAA и EndpointSlice; протестировать смену Pod IP.",
    "rubric": "Объяснить endpoint discovery и обязанности клиента.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/service/",
    "source_prompts": [
      {
        "number": 56,
        "question": "Сервис типа ClusterIP со значением `None` — это что за сервис? Что реализует эти сервисы в кубере?"
      },
      {
        "number": 57,
        "question": "Что такое Headless Service и для чего используется?"
      },
      {
        "number": 58,
        "question": "Что такое Headless Service?"
      }
    ]
  },
  {
    "id": "K8S-022",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Как externalTrafficPolicy Local влияет на трафик LoadBalancer?",
    "answer": "При Local внешний трафик Service направляется на локальные для узла подходящие backend, без перенаправления на другой узел. Это помогает сохранять source IP в типичной реализации, но узлы без локальных endpoints не обслуживают этот путь; балансировка нагрузки зависит от внешнего LB. При Cluster доступны endpoints других узлов.",
    "follow_up": "Как избежать перекоса при неравномерном распределении Pod? Что проверить у конкретного LB?",
    "practice": "Проверить endpoints по узлам, health checks балансировщика, исходный IP в приложении.",
    "rubric": "Назвать компромисс source IP, распределения и реализации балансировщика.",
    "source": "https://kubernetes.io/docs/reference/networking/virtual-ips/"
  },
  {
    "id": "K8S-023",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Почему NetworkPolicy может не заблокировать трафик после apply?",
    "answer": "API принимает объект, но enforcement обеспечивает сетевой плагин, который должен поддерживать NetworkPolicy. Также политики суммируют разрешения; неверный selector может вообще не изолировать Pod. Проверяй направления ingress/egress, обе стороны соединения и возможности CNI.",
    "follow_up": "Как доказать default-deny без остановки production? Почему нужна отдельная DNS policy?",
    "practice": "На учебном namespace проверить разрешённый и запрещённый TCP-запросы, labels и DNS.",
    "rubric": "Различать API и dataplane; объяснить additive allow и scope policy.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/network-policies/",
    "source_prompts": [
      {
        "number": 67,
        "question": "Как можно ограничить сетевое взаимодействие между namespace?"
      }
    ]
  },
  {
    "id": "K8S-024",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Почему соединение между двумя Pod может быть запрещено при разрешённом ingress получателя?",
    "answer": "Если источник изолирован egress-политикой, исходящее соединение тоже должно быть разрешено. Ingress и egress оцениваются независимо, а разрешения нескольких политик одного направления объединяются. Ответный трафик разрешённого соединения обычно не требует отдельной симметричной policy.",
    "follow_up": "Как namespaceSelector комбинируется с podSelector в одном peer? Что изменится, если они в разных элементах списка?",
    "practice": "Проверить YAML обоих namespace и labels; выполнить тест из конкретного source Pod.",
    "rubric": "Объяснить две стороны соединения и AND/OR семантику selectors.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/network-policies/"
  },
  {
    "id": "K8S-025",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Как ndots и search domains могут повышать нагрузку на CoreDNS?",
    "answer": "Resolver может дописывать search suffixes к имени с количеством точек меньше ndots, пробуя несколько DNS-имён перед абсолютным запросом. Это увеличивает число запросов и иногда задержки. Анализировать фактический resolv.conf и запросы; абсолютные FQDN с завершающей точкой или изменение dnsConfig применяют после теста совместимости.",
    "follow_up": "Почему нельзя просто глобально поставить ndots=1? Что означает NXDOMAIN для отдельного search suffix?",
    "practice": "kubectl exec в учебный Pod -- cat /etc/resolv.conf; сравнить dig для короткого и абсолютного имени.",
    "rubric": "Связать search, ndots, DNS latency и риск изменения поведения приложения.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/"
  },
  {
    "id": "K8S-026",
    "topic": "Kubernetes",
    "section": "storage",
    "level": "middle",
    "question": "Чем PVC, PV и StorageClass отличаются?",
    "answer": "PVC выражает запрос приложения на хранилище, PV представляет доступный том, StorageClass описывает правила динамического provisioning и параметры. Binding связывает claim с подходящим volume. Данные физически находятся в storage backend, а не внутри API-объекта PVC.",
    "follow_up": "Что означает Pending PVC? Где определены reclaimPolicy и volumeBindingMode?",
    "practice": "kubectl get pvc,pv,storageclass; kubectl describe pvc; проверить provisioner и events.",
    "rubric": "Разделять запрос, объект тома и правила provisioning.",
    "source": "https://kubernetes.io/docs/concepts/storage/persistent-volumes/",
    "source_prompts": [
      {
        "number": 45,
        "question": "PV (PersistentVolume) и PVC (PersistentVolumeClaim): что это такое, что используется для stateful-приложений?"
      },
      {
        "number": 52,
        "question": "Что такое StorageClass?"
      }
    ]
  },
  {
    "id": "K8S-027",
    "topic": "Kubernetes",
    "section": "storage",
    "level": "senior",
    "question": "Почему ReadWriteOnce не означает доступ только из одного Pod?",
    "answer": "RWO описывает возможность монтирования тома в режиме read-write с одного узла; несколько Pod на этом узле могут использовать том, если это поддержано. ReadWriteOncePod предназначен для ограничения одним Pod при поддержке CSI. Режим доступа не обеспечивает блокировку транзакций внутри приложения.",
    "follow_up": "Что произойдёт при переносе RWO Pod на другой узел? Как диагностировать Multi-Attach?",
    "practice": "Проверить accessModes, VolumeAttachment, CSI events и состояние старого узла.",
    "rubric": "Различить node и Pod scope; не путать access mode с защитой данных.",
    "source": "https://kubernetes.io/docs/concepts/storage/persistent-volumes/"
  },
  {
    "id": "K8S-028",
    "topic": "Kubernetes",
    "section": "storage",
    "level": "senior",
    "question": "Зачем WaitForFirstConsumer в StorageClass?",
    "answer": "Режим откладывает binding/provisioning до появления Pod-потребителя, чтобы учитывать требования размещения и топологию. Это снижает вероятность создать zonal volume в зоне, где Pod не может разместиться. Immediate может связать том заранее, не зная ограничений Pod.",
    "follow_up": "Почему Pending PVC без потребителя может быть нормальным? Чем опасно указать nodeName напрямую?",
    "practice": "Проверить volumeBindingMode, Pod scheduling events, node affinity тома.",
    "rubric": "Объяснить согласование topology storage и scheduler, а не считать Pending ошибкой всегда.",
    "source": "https://kubernetes.io/docs/concepts/storage/storage-classes/"
  },
  {
    "id": "K8S-029",
    "topic": "Kubernetes",
    "section": "storage",
    "level": "lead",
    "question": "Как безопасно вывести из эксплуатации PVC с reclaimPolicy Delete?",
    "answer": "До удаления определить реальный backend, владельца данных и требования retention. Подтвердить проверенную резервную копию или миграцию и при необходимости заранее изменить reclaimPolicy конкретного PV на Retain согласно согласованной процедуре. Delete при поддержке backend может удалить физический том после освобождения claim. Retain не заменяет backup.",
    "follow_up": "Как отличить политику StorageClass от фактической политики PV? Как проверить восстановление?",
    "practice": "kubectl get pv -o yaml; проверить backup restore в отдельном namespace и подтверждение владельца.",
    "rubric": "Не удалять claim вслепую; назвать риск удаления внешнего storage и доказательства восстановления.",
    "source": "https://kubernetes.io/docs/tasks/administer-cluster/change-pv-reclaim-policy/"
  },
  {
    "id": "K8S-030",
    "topic": "Kubernetes",
    "section": "security",
    "level": "middle",
    "question": "В чём различие RoleBinding и ClusterRoleBinding?",
    "answer": "RoleBinding выдаёт права в своём namespace, даже если ссылается на ClusterRole. ClusterRoleBinding распространяет права указанной ClusterRole в масштабе кластера. Подбирай минимальные verbs и resources; не используй cluster-admin для обычного приложения.",
    "follow_up": "Как дать чтение Pod только в namespace team-a? Как проверить права service account?",
    "practice": "kubectl auth can-i get pods --as=system:serviceaccount:team-a:reader -n team-a; для impersonation нужны права.",
    "rubric": "Объяснить scope binding и least privilege.",
    "source": "https://kubernetes.io/docs/reference/access-authn-authz/rbac/"
  },
  {
    "id": "K8S-031",
    "topic": "Kubernetes",
    "section": "security",
    "level": "senior",
    "question": "Почему право создавать Pod может дать больше доступа, чем кажется?",
    "answer": "Создатель Pod потенциально способен запускать workload под ServiceAccount этого namespace и монтировать доступные там данные при отсутствии дополнительных ограничений. Это создаёт косвенные пути эскалации. RBAC следует сочетать с namespace isolation, admission policies и контролем workload identity.",
    "follow_up": "Почему запрет прямого get secrets недостаточен? Что ограничить admission policy?",
    "practice": "Ревью create workloads, serviceAccountName, mounts, securityContext и namespace boundaries.",
    "rubric": "Объяснить косвенное получение полномочий и защиту несколькими слоями.",
    "source": "https://kubernetes.io/docs/concepts/security/rbac-good-practices/"
  },
  {
    "id": "K8S-032",
    "topic": "Kubernetes",
    "section": "security",
    "level": "senior",
    "question": "Как уменьшить риск утечки ServiceAccount token из Pod?",
    "answer": "Если приложение не обращается к Kubernetes API, отключить automountServiceAccountToken. Если API нужен, использовать отдельный ServiceAccount с минимальными правами и краткоживущий projected token с подходящим audience. Не помещать токены в логи или образы; учитывать ротацию и реакцию клиента на обновление файла.",
    "follow_up": "Зачем audience? Как отзывать доступ при компрометации workload?",
    "practice": "Проверить serviceAccountName, automount, projected volumes и фактические RBAC права без вывода токена.",
    "rubric": "Различать identity, права и срок жизни credential.",
    "source": "https://kubernetes.io/docs/concepts/security/service-accounts/"
  },
  {
    "id": "K8S-033",
    "topic": "Kubernetes",
    "section": "security",
    "level": "senior",
    "question": "Как внедрить Pod Security Admission в существующий namespace без массового отказа деплоев?",
    "answer": "Сначала применить warn/audit на целевом уровне и проверить нарушения. Исправить workload templates, затем включать enforce поэтапно, с согласованными исключениями и закреплением версии политики. Admission проверяет новые запросы, а не автоматически исправляет уже работающие Pod.",
    "follow_up": "Чем baseline отличается от restricted? Что случится при пересоздании старого нарушающего Pod?",
    "practice": "Проверить namespace labels, предупреждения server-side dry-run и rollout на тестовой копии.",
    "rubric": "Объяснить warn/audit/enforce, staged migration и риск новых Pod.",
    "source": "https://kubernetes.io/docs/concepts/security/pod-security-admission/"
  },
  {
    "id": "K8S-034",
    "topic": "Kubernetes",
    "section": "security",
    "level": "lead",
    "question": "Как отказ validating admission webhook способен остановить деплои?",
    "answer": "Webhook находится на пути записи в API для совпавших запросов. Если он недоступен или превышает timeout, failurePolicy Fail может отклонить запрос; Ignore позволяет запросу продолжиться, ослабляя контроль при отказе webhook. Проектируй узкую область match, независимую доступность и осознанную политику отказа.",
    "follow_up": "Как избежать циклической зависимости восстановления webhook от самого webhook? Почему fail-open не универсален?",
    "practice": "Проверить webhook configurations, failurePolicy, timeoutSeconds, API errors и HA самого webhook.",
    "rubric": "Назвать компромисс availability/security и безопасный recovery path.",
    "source": "https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/"
  },
  {
    "id": "K8S-035",
    "topic": "Kubernetes",
    "section": "security",
    "level": "senior",
    "question": "Чем encryption at rest Kubernetes Secrets отличается от TLS?",
    "answer": "TLS защищает передачу между компонентами. Encryption at rest защищает выбранные объекты при записи в etcd при корректной настройке провайдера и ключей. Это не устраняет риск чтения через API с разрешением RBAC или компрометации приложения, а существующие записи могут потребовать перезаписи для применения нового ключа.",
    "follow_up": "Как проверить ротацию ключа без раскрытия Secret? Почему backup etcd требует отдельной защиты?",
    "practice": "Проверить конфигурацию encryption provider и провести тест на синтетическом Secret в отдельной среде.",
    "rubric": "Различать in-transit, at-rest, RBAC и key management.",
    "source": "https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/"
  },
  {
    "id": "K8S-036",
    "topic": "Kubernetes",
    "section": "delivery",
    "level": "senior",
    "question": "В Deployment 7 реплик, maxSurge=25% и maxUnavailable=25%. Какие границы задаёт стратегия обновления?",
    "answer": "Проценты вычисляются от желаемых 7 реплик: maxSurge округляется вверх до 2, maxUnavailable вниз до 1. Контроллер стремится сохранять минимум 6 доступных реплик и допускает до 9 реплик в ходе обновления; завершающиеся Pod могут временно увеличить фактическое потребление ресурсов. Это не гарантия доступности при независимых отказах.",
    "follow_up": "Что произойдёт при отсутствии места для surge? Почему число контейнеров на узлах может быть больше девяти?",
    "practice": "На учебном Deployment сравнить desired, available, updated и terminating Pod при rollout.",
    "rubric": "Правильное округление, различение границ контроллера и физических ресурсов.",
    "source": "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/"
  },
  {
    "id": "K8S-037",
    "topic": "Kubernetes",
    "section": "delivery",
    "level": "senior",
    "question": "Что делает Deployment при ProgressDeadlineExceeded?",
    "answer": "Контроллер выставляет условие Progressing=False с причиной ProgressDeadlineExceeded. Это сигнал отсутствия прогресса, а не автоматический rollback. Нужно выявить препятствие: quotas, scheduling, image pull, readiness или сбой приложения. Система доставки может применить отдельную политику остановки или отката.",
    "follow_up": "Как отличается minReadySeconds от progressDeadlineSeconds? Как определить причину через ReplicaSet?",
    "practice": "kubectl rollout status deployment/demo; kubectl describe deployment demo; проверить условия и события дочерних Pod.",
    "rubric": "Не обещать автоматический откат; объяснить диагностический путь и условия.",
    "source": "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/"
  },
  {
    "id": "K8S-038",
    "topic": "Kubernetes",
    "section": "delivery",
    "level": "senior",
    "question": "Почему kubectl rollout undo не восстанавливает предыдущую версию данных?",
    "answer": "Undo возвращает шаблон Pod из доступной истории ReplicaSet. Он не отменяет SQL-миграции, изменение внешнего хранилища, независимых ConfigMap и Secret. Если образ задан изменяемым тегом, прежний шаблон даже не гарантирует прежние байты образа. Безопасный rollback требует неизменяемых артефактов и совместимой схемы.",
    "follow_up": "Что произойдёт при revisionHistoryLimit=0? Как согласовать rollback с GitOps?",
    "practice": "kubectl rollout history deployment/demo; сравнить Pod template и digest; проверить обратную совместимость на тестовой БД.",
    "rubric": "Назвать область rollback и необходимость отдельного плана данных.",
    "source": "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/"
  },
  {
    "id": "K8S-039",
    "topic": "Kubernetes",
    "section": "delivery",
    "level": "lead",
    "question": "Как выполнить canary для новой версии, если обычный Service не гарантирует точные 5% запросов?",
    "answer": "Раздельные Deployment старой и новой версии позволяют независимо управлять релизами. Service с общим selector распределяет трафик между доступными endpoints согласно dataplane, но число Pod не гарантирует долю HTTP-запросов из-за keepalive и неоднородной нагрузки. Для управляемого веса нужен поддерживающий его L7 маршрутизатор. Сравнивай SLI по версиям и задай критерий остановки.",
    "follow_up": "Как учитывать длинные соединения? Когда остановить эксперимент при малой выборке?",
    "practice": "В изолированном стенде измерить долю запросов по версии и ошибки каждой группы.",
    "rubric": "Различать реплики и вес трафика, предусмотреть измерения и rollback.",
    "source": "https://kubernetes.io/docs/concepts/workloads/management/",
    "source_prompts": [
      {
        "number": 113,
        "question": "Расскажите, как бы вы настраивали канареечные релизы."
      }
    ]
  },
  {
    "id": "K8S-040",
    "topic": "Kubernetes",
    "section": "delivery",
    "level": "senior",
    "question": "Почему обновление StatefulSet может зависнуть даже после исправления ошибочного шаблона?",
    "answer": "При OrderedReady контроллер обновляет Pod в определённом порядке и ждёт готовности. Если уже созданный Pod с неправильной конфигурацией никогда не становится Ready, возврат к рабочему шаблону не всегда автоматически разблокирует rollout. После проверки причины и исправления шаблона может потребоваться удалить именно ошибочные Pod, чтобы контроллер их пересоздал.",
    "follow_up": "Какие риски удаления участника кворума? Как ограничить обновление partition?",
    "practice": "В учебном StatefulSet проверить revisions, readiness и порядок обновления; не удалять одновременно участников кворума.",
    "rubric": "Объяснить forced rollback, порядок и проверку состояния приложения.",
    "source": "https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/"
  },
  {
    "id": "K8S-041",
    "topic": "Kubernetes",
    "section": "autoscaling",
    "level": "middle",
    "question": "Как HPA рассчитывает желаемое число реплик по CPU?",
    "answer": "Базовая формула: ceil(currentReplicas × currentMetricValue / desiredMetricValue). При 4 репликах, среднем CPU utilization 80% и цели 50% получается 7 реплик до применения ограничений и правил контроллера. Utilization считается относительно CPU requests. На результат влияют missing metrics, readiness, tolerance, min/maxReplicas и scaling behavior.",
    "follow_up": "Почему HPA может не масштабироваться, несмотря на высокий CPU? Как влияет отсутствие requests?",
    "practice": "kubectl get hpa; kubectl describe hpa; сравнить requests и доступность resource metrics.",
    "rubric": "Рассчитать 7 и объяснить, почему реальное решение контроллера может отличаться.",
    "source": "https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/"
  },
  {
    "id": "K8S-042",
    "topic": "Kubernetes",
    "section": "autoscaling",
    "level": "senior",
    "question": "Почему HPA не уменьшает реплики сразу после падения нагрузки?",
    "answer": "HPA учитывает прошлые рекомендации в окне стабилизации scaleDown, чтобы не реагировать на краткие провалы нагрузки. Дополнительно scaling policies ограничивают скорость изменения. При недоступности одной из метрик контроллер может отказаться от уменьшения. Это предотвращает flapping ценой более медленного освобождения ресурсов.",
    "follow_up": "Как настроить scaleDown stabilization и оценить последствия? Почему scaleUp может вести себя иначе?",
    "practice": "Наблюдать desiredReplicas и события HPA на ступенчатой нагрузке; сравнить разные behavior настройки.",
    "rubric": "Различать окно стабилизации, rate limits и ошибки метрик.",
    "source": "https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/"
  },
  {
    "id": "K8S-043",
    "topic": "Kubernetes",
    "section": "autoscaling",
    "level": "senior",
    "question": "Как масштабировать обработчики очереди, если CPU не отражает backlog?",
    "answer": "CPU плохо отражает ожидание внешнего I/O. Можно использовать external или custom metric, например глубину очереди или возраст старейшего сообщения через совместимый metrics adapter. Выбирай целевое значение с учётом скорости обработки одной реплики, числа partitions, задержки запуска и допустимого времени ликвидации backlog. Масштабирование выше пропускной способности downstream бесполезно.",
    "follow_up": "Как оценить необходимое число consumer по скорости входа и обработки? Что делать при недоступной метрике?",
    "practice": "На локальном стенде сравнить backlog, throughput и число активных consumer до и после изменения нагрузки.",
    "rubric": "Связать метрику с SLO, учесть ограничения downstream и аварийное поведение.",
    "source": "https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/"
  },
  {
    "id": "K8S-044",
    "topic": "Kubernetes",
    "section": "autoscaling",
    "level": "lead",
    "question": "Почему одновременная настройка HPA по CPU и автоматического изменения CPU requests требует осторожности?",
    "answer": "HPA по utilization использует requests как знаменатель. Если другой контроллер увеличивает requests, utilization при прежней нагрузке снижается, и HPA может уменьшить реплики. Обратная связь способна вызвать нежелательные колебания. Разделяй роли автоматизации: например, VPA в режиме рекомендаций и HPA по бизнес-метрике либо тщательно проверенная совместная политика.",
    "follow_up": "Как валидировать рекомендации VPA? В каких случаях масштабирование Pod требует пересоздания?",
    "practice": "В учебном кластере наблюдать requests, actual usage, replicas и p99 при изменении нагрузки.",
    "rubric": "Понимать связь контроллеров, зависимость от версии и измеримый эксперимент.",
    "source": "https://kubernetes.io/docs/concepts/workloads/autoscaling/"
  },
  {
    "id": "K8S-045",
    "topic": "Kubernetes",
    "section": "autoscaling",
    "level": "lead",
    "question": "Почему добавление узлов не всегда помогает Pending Pod?",
    "answer": "Node autoscaler оценивает, смогут ли дополнительные узлы подходящего типа разместить unschedulable Pod с учётом requests и ограничений. Невыполнимая affinity, неподходящий storage topology, максимальный размер пула или невозможный request могут сделать расширение бесполезным. Сначала изучи причины FailedScheduling, затем capacity и ограничения autoscaler.",
    "follow_up": "Как отличить нехватку ресурсов от невозможной конфигурации? Что если Pod запрашивает 64 CPU, а самый большой узел имеет 32?",
    "practice": "Сопоставить scheduler events, допустимые node groups, allocatable и limits пула.",
    "rubric": "Отличать HPA и масштабирование узлов; не сводить любой Pending к capacity.",
    "source": "https://kubernetes.io/docs/concepts/cluster-administration/node-autoscaling/",
    "source_prompts": [
      {
        "number": 78,
        "question": "Как бы вы реализовали проблему с нехваткой ресурсов в кластере?"
      },
      {
        "number": 96,
        "question": "Что если под находится в состоянии `Pending`?"
      }
    ]
  },
  {
    "id": "K8S-046",
    "topic": "Kubernetes",
    "section": "api",
    "level": "senior",
    "question": "Почему два клиента получают HTTP 409 при изменении одного объекта Kubernetes?",
    "answer": "Для операций обновления API использует optimistic concurrency: клиент читает resourceVersion, изменяет объект и отправляет обновление с прежней версией. Если объект уже изменён, сервер может вернуть Conflict. Клиент должен перечитать актуальное состояние и повторно вычислить изменение, а не слепо перезаписать его.",
    "follow_up": "Как отличается конфликт resourceVersion от конфликта владельцев полей при SSA? Почему retry должен быть ограничен?",
    "practice": "На учебном объекте воспроизвести обновление со старым resourceVersion; сравнить результат после перечитывания.",
    "rubric": "Объяснить optimistic concurrency и безопасный read-modify-write.",
    "source": "https://kubernetes.io/docs/reference/using-api/api-concepts/"
  },
  {
    "id": "K8S-047",
    "topic": "Kubernetes",
    "section": "api",
    "level": "senior",
    "question": "Чем Server-Side Apply отличается от обычного Update?",
    "answer": "SSA описывает намерение менеджера полей. API server ведёт managedFields и при несовместимом изменении поля другим владельцем может вернуть конфликт. Update заменяет представление объекта по правилам ресурса и optimistic concurrency, не используя ту же apply-модель конфликтов. Принудительный захват поля допустим только после выяснения, кто им управляет.",
    "follow_up": "Почему GitOps и HPA могут конфликтовать за replicas? Когда применять --force-conflicts?",
    "practice": "На учебном ConfigMap выполнить apply двумя field managers и исследовать managedFields.",
    "rubric": "Различать ownership и resourceVersion, не применять force как универсальное решение.",
    "source": "https://kubernetes.io/docs/reference/using-api/server-side-apply/"
  },
  {
    "id": "K8S-048",
    "topic": "Kubernetes",
    "section": "api",
    "level": "senior",
    "question": "Как клиент Kubernetes восстанавливает watch после HTTP 410 Gone?",
    "answer": "История изменений хранится ограниченное время. Если watch запрашивает уже недоступную resourceVersion, сервер может вернуть 410 Gone. Клиент должен получить актуальный LIST, обновить локальное состояние и открыть watch с новой resourceVersion. Обработчики должны выдерживать повторные события и повторное вычисление состояния.",
    "follow_up": "Что даёт BOOKMARK? Почему нельзя считать watch бесконечным журналом событий?",
    "practice": "В тестовом контроллере имитировать устаревший watch и проверить resync после relist.",
    "rubric": "Объяснить LIST/WATCH, потерю истории и идемпотентную обработку.",
    "source": "https://kubernetes.io/docs/reference/using-api/api-concepts/"
  },
  {
    "id": "K8S-049",
    "topic": "Kubernetes",
    "section": "api",
    "level": "middle",
    "question": "Чем labels отличаются от annotations и почему это важно для контроллеров?",
    "answer": "Labels предназначены для идентификации и выборки объектов selectors, поэтому их значения должны отражать стабильные классификационные признаки. Annotations подходят для дополнительной метаинформации, например checksum конфигурации, ссылки на сборку и настройки инструментов. Смена label может изменить принадлежность Pod к Service или контроллеру.",
    "follow_up": "Можно ли выбрать Pod по annotation обычным label selector? Почему уникальный request ID не стоит помещать в label метрик?",
    "practice": "kubectl get pods -l app=demo; сравнить labels и annotations в YAML объекта.",
    "rubric": "Различать выборку, метаданные и последствия изменения selector.",
    "source": "https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/",
    "source_prompts": [
      {
        "number": 88,
        "question": "Что такое `labels` и `selectors`?"
      },
      {
        "number": 89,
        "question": "Отличие `label` и `selector`?"
      }
    ]
  },
  {
    "id": "K8S-050",
    "topic": "Kubernetes",
    "section": "api",
    "level": "senior",
    "question": "Зачем CRD используют несколько версий API и conversion webhook?",
    "answer": "CRD может предоставлять несколько served версий одной сущности; одна версия назначается storage для новых записей. При чтении и записи сервер преобразует объект между версиями. Если схемы существенно отличаются, conversion webhook отвечает за семантическое преобразование. Смена storage version сама по себе не переписывает старые объекты.",
    "follow_up": "Как безопасно удалить старую served version? Где проверять status.storedVersions?",
    "practice": "На тестовой CRD проверить served/storage, round-trip conversion и миграцию существующих объектов.",
    "rubric": "Различать served и storage, учитывать старые клиенты и потерю данных при преобразовании.",
    "source": "https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definition-versioning/",
    "source_prompts": [
      {
        "number": 124,
        "question": "CRD и операторы."
      }
    ]
  },
  {
    "id": "K8S-051",
    "topic": "Kubernetes",
    "section": "api",
    "level": "lead",
    "question": "Что требуется от оператора, чтобы его reconciliation оставался корректным после падения процесса?",
    "answer": "Оператор должен заново выводить необходимые действия из фактического и желаемого состояния, а не полагаться на память предыдущего процесса. Внешние операции должны быть идемпотентными или иметь устойчивый ключ корреляции; status отражает подтверждённый результат. Конфликты API, повторные события, временные ошибки и удаление объекта требуют явных обработчиков.",
    "follow_up": "Как избежать повторного создания внешней БД после таймаута API? Что должно храниться в status и finalizer?",
    "practice": "В учебном операторе прервать процесс между внешним действием и обновлением status; проверить отсутствие дублей после рестарта.",
    "rubric": "Объяснить crash consistency, idempotency key и reconciliation по наблюдаемому состоянию.",
    "source": "https://kubernetes.io/docs/concepts/extend-kubernetes/operator/",
    "source_prompts": [
      {
        "number": 123,
        "question": "Что такое оператор, для чего нужен?"
      }
    ]
  },
  {
    "id": "K8S-052",
    "topic": "Kubernetes",
    "section": "troubleshooting",
    "level": "middle",
    "question": "Чем CrashLoopBackOff отличается от ImagePullBackOff?",
    "answer": "CrashLoopBackOff означает задержку перед очередным рестартом контейнера, который уже запускался и завершался. ImagePullBackOff означает повторные неудачи загрузки образа. Причины и доказательства различаются: предыдущие логи и termination reason против событий pull, имени образа, registry credentials или сетевого доступа.",
    "follow_up": "Почему статус в kubectl get pods не всегда равен phase? Какие логи смотреть после рестарта?",
    "practice": "kubectl describe pod demo; kubectl logs demo -c app --previous; проверить waiting/terminated state.",
    "rubric": "Различить запуск и загрузку, выбирать правильный источник диагностики.",
    "source": "https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/",
    "source_prompts": [
      {
        "number": 97,
        "question": "Что если под находится в состоянии `CrashLoopBackOff`?"
      }
    ]
  },
  {
    "id": "K8S-053",
    "topic": "Kubernetes",
    "section": "troubleshooting",
    "level": "senior",
    "question": "Как диагностировать Pod с Init:CrashLoopBackOff, если логи основного приложения отсутствуют?",
    "answer": "Обычные init containers должны успешно завершиться до запуска app containers. Сначала выясни, какой init container блокирует запуск, затем изучи его exit code, события, команды, mounts и зависимости. Логи основного контейнера могут отсутствовать, поскольку он ещё не запускался. Не подменяй ошибку бесконечным retry без проверки зависимости.",
    "follow_up": "Как посмотреть предыдущий запуск init container? Что изменится для native sidecar?",
    "practice": "kubectl describe pod demo; kubectl logs demo -c init-db --previous; проверить initContainerStatuses.",
    "rubric": "Различать обычный init и restartable sidecar, опираться на статус конкретного контейнера.",
    "source": "https://kubernetes.io/docs/concepts/workloads/pods/init-containers/",
    "source_prompts": [
      {
        "number": 98,
        "question": "Что такое `init container`? Для чего он нужен?"
      }
    ]
  },
  {
    "id": "K8S-054",
    "topic": "Kubernetes",
    "section": "troubleshooting",
    "level": "senior",
    "question": "Как расследовать сбой приложения в distroless-контейнере без shell?",
    "answer": "Не требуется пересобирать production-образ с отладочными утилитами. С разрешения и в контролируемой среде можно добавить ephemeral debug container с подходящим образом и исследовать общую сеть Pod; доступ к процессам зависит от namespace и поддержки runtime. Сначала собрать logs, events и metrics. Отладочный контейнер не должен получать избыточные привилегии.",
    "follow_up": "Когда предпочтительнее копия Pod? Какие права нужны на ephemeralcontainers?",
    "practice": "На учебном Pod применить kubectl debug с разрешённым образом; проверить сетевое пространство и доступность процессов.",
    "rubric": "Учитывать ограничения безопасности, runtime и отсутствие гарантии доступа к чужой FS.",
    "source": "https://kubernetes.io/docs/tasks/debug/debug-application/debug-running-pod/"
  },
  {
    "id": "K8S-055",
    "topic": "Kubernetes",
    "section": "troubleshooting",
    "level": "senior",
    "question": "Почему после рестарта контейнера файл в emptyDir сохраняется, а после пересоздания Pod исчезает?",
    "answer": "emptyDir создаётся для жизненного цикла конкретного Pod на узле и доступен контейнерам этого Pod. Перезапуск отдельного контейнера не удаляет volume; удаление Pod с узла уничтожает данные emptyDir. Для устойчивых данных требуется иной storage backend и отдельная стратегия резервного копирования.",
    "follow_up": "Что произойдёт при eviction Pod? Как medium: Memory влияет на ресурсные ограничения?",
    "practice": "Записать файл в emptyDir на учебном стенде, перезапустить контейнер, затем пересоздать Pod и сравнить.",
    "rubric": "Различить container lifetime и Pod lifetime, учесть память и временность.",
    "source": "https://kubernetes.io/docs/concepts/storage/volumes/"
  },
  {
    "id": "K8S-056",
    "topic": "Kubernetes",
    "section": "troubleshooting",
    "level": "senior",
    "question": "Почему kubectl logs не показывает сообщения старого Pod после его удаления?",
    "answer": "kubectl logs обращается к API для логов контейнера, доступных на узле. Флаг --previous показывает предыдущий экземпляр контейнера внутри существующего Pod, а не произвольный удалённый Pod. Ротация и удаление Pod ограничивают доступную историю. Для расследований нужен централизованный сбор с идентификаторами workload, namespace, Pod и временными метками.",
    "follow_up": "Почему хранение stdout на узле не является долговременным архивом? Как избежать утечки токенов в логах?",
    "practice": "Сравнить logs и --previous до и после рестарта; проверить сбор в изолированном лог-стенде.",
    "rubric": "Различать локальную историю контейнера и централизованное хранение.",
    "source": "https://kubernetes.io/docs/concepts/cluster-administration/logging/"
  },
  {
    "id": "K8S-057",
    "topic": "Kubernetes",
    "section": "troubleshooting",
    "level": "senior",
    "question": "Что означает Node DiskPressure и почему очистка образов может не решить проблему?",
    "answer": "Kubelet наблюдает сигналы нехватки дискового пространства и inode на соответствующих файловых системах. Он может сначала освободить ресурсы, затем выполнить eviction. Источником бывают writable layers, logs, emptyDir, образы или другие файлы узла; очистка только образов помогает не всегда. Нужно определить конкретную файловую систему и потребителя.",
    "follow_up": "Почему df -h может выглядеть нормально при исчерпании inode? Как отличить eviction от OOM?",
    "practice": "Проверить node conditions, df -h, df -i, события eviction и локальные потребители диска на учебном узле.",
    "rubric": "Назвать bytes/inodes, сигналы kubelet и безопасное освобождение места.",
    "source": "https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/"
  },
  {
    "id": "K8S-058",
    "topic": "Kubernetes",
    "section": "troubleshooting",
    "level": "senior",
    "question": "Как отличить потерю heartbeat узла от реального завершения всех его контейнеров?",
    "answer": "Control plane определяет доступность узла по heartbeat и Lease. При потере связи Node может стать Unknown/NotReady, но процессы на нём способны продолжать работу. После соответствующих taints и tolerations контроллеры могут создать replacement Pod. Для stateful систем это создаёт риск двойного выполнения без fencing.",
    "follow_up": "Почему нельзя считать удаление объекта Node доказательством остановки процесса? Как проверить сетевую изоляцию?",
    "practice": "Сопоставить Node conditions, Lease, состояние kubelet и независимую проверку workload на учебном узле.",
    "rubric": "Различать состояние API и фактическое состояние; понимать split-brain риск.",
    "source": "https://kubernetes.io/docs/concepts/architecture/nodes/"
  },
  {
    "id": "K8S-059",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Почему запрос к ClusterIP не обязательно проходит через kube-proxy как через пользовательский процесс?",
    "answer": "В распространённых режимах kube-proxy программирует правила dataplane на узле, а не проксирует каждый пакет в userspace. Конкретный путь зависит от режима и CNI; альтернативные реализации могут заменять kube-proxy. Диагностику нужно строить по фактической реализации, а не искать процесс, который якобы принимает каждый запрос.",
    "follow_up": "Как различить режимы iptables, IPVS, nftables и eBPF-реализацию? Что проверить при отсутствии правила Service?",
    "practice": "Проверить kube-proxy config и документацию CNI; сравнить Service, EndpointSlice и dataplane на тестовом узле.",
    "rubric": "Разделить control programming и packet forwarding; не предполагать один универсальный backend.",
    "source": "https://kubernetes.io/docs/reference/networking/virtual-ips/"
  },
  {
    "id": "K8S-060",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Что представляет EndpointSlice и почему не следует считать число объектов EndpointSlice числом backend Pod?",
    "answer": "EndpointSlice хранит группы endpoints для Service и информацию об адресах, портах и условиях ready/serving/terminating. Один Service может иметь несколько slices из-за количества адресов, семейств IP и портов. Нужно агрегировать подходящие endpoints, учитывая условия и возможные дубли во время обновлений.",
    "follow_up": "Когда terminating endpoint ещё serving? Как отличить отсутствие endpoints от endpoint с ready=false?",
    "practice": "kubectl get endpointslices -l kubernetes.io/service-name=demo -o yaml; сравнить адреса и targetRef.",
    "rubric": "Объяснить группировку endpoints и условия, не считать объекты или адреса вслепую.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/"
  },
  {
    "id": "K8S-061",
    "topic": "Kubernetes",
    "section": "network",
    "level": "middle",
    "question": "Почему Ingress-объект сам по себе не публикует HTTP-приложение?",
    "answer": "Ingress задаёт правила HTTP/HTTPS маршрутизации, но реализацию обеспечивает Ingress controller соответствующего класса. Без контроллера объект может существовать без работающего dataplane. Проверяй IngressClass, адрес публикации, состояние контроллера, backend Service и TLS. Для произвольного TCP/UDP обычный Ingress не является универсальным API.",
    "follow_up": "Чем отличается IngressClass от аннотаций конкретного контроллера? Как проверить правильный Host header?",
    "practice": "kubectl get ingressclass,ingress; curl с нужным Host и проверяемым TLS; изучить logs контроллера.",
    "rubric": "Различать декларацию и контроллер, учесть реализацию и HTTP scope.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/ingress/"
  },
  {
    "id": "K8S-062",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Как Gateway API разделяет ответственность платформенной команды и владельца приложения?",
    "answer": "GatewayClass выбирает реализацию, Gateway описывает listeners и инфраструктурные параметры, HTTPRoute описывает маршрутизацию к backend. Платформа может контролировать Gateway и разрешённые маршруты, а команда приложения — свои HTTPRoute. Cross-namespace ссылки на backend требуют соответствующего разрешения, например ReferenceGrant, когда это предусмотрено API.",
    "follow_up": "Как allowedRoutes ограничивает подключение HTTPRoute? Как проверить статус Accepted и ResolvedRefs?",
    "practice": "В поддерживающем Gateway API стенде проверить условия Gateway/HTTPRoute и маршрут к тестовому Service.",
    "rubric": "Различать классы, listeners, route ownership и межпространственные разрешения.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/gateway/"
  },
  {
    "id": "K8S-063",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Почему sessionAffinity: ClientIP не заменяет корректное хранение пользовательской сессии?",
    "answer": "ClientIP affinity помогает направлять трафик определённого источника к тому же backend в пределах настроек Service. NAT, общие proxy, смена IP и исчезновение backend нарушают предположение о постоянстве. Состояние сессии лучше проектировать отдельно, например во внешнем хранилище с проверенной доступностью или через безопасный stateless token.",
    "follow_up": "Как общий NAT влияет на распределение нагрузки? Что произойдёт после удаления backend?",
    "practice": "Сравнить распределение запросов из разных клиентов и поведение при пересоздании Pod.",
    "rubric": "Не обещать жёсткую привязку пользователя, объяснить ограничения сетевой affinity.",
    "source": "https://kubernetes.io/docs/reference/networking/virtual-ips/"
  },
  {
    "id": "K8S-064",
    "topic": "Kubernetes",
    "section": "storage",
    "level": "senior",
    "question": "Почему увеличение размера PVC не всегда немедленно увеличивает файловую систему в контейнере?",
    "answer": "Расширение зависит от StorageClass allowVolumeExpansion и возможностей драйвера. Сначала backend/controller может расширить volume, затем node-компонент и файловая система завершают resize. Для некоторых сочетаний нужен remount или пересоздание Pod. Проверяй PVC conditions, capacity PV/PVC и размер файловой системы, не изменяй вручную PV capacity в обход процедуры.",
    "follow_up": "Почему нельзя уменьшить PVC обычным изменением requests.storage? Что делать при зависшем resize?",
    "practice": "В тестовом CSI backend проверить условия PVC, события и df -h внутри Pod.",
    "rubric": "Разделить backend resize и filesystem resize, проверить поддержку драйвера.",
    "source": "https://kubernetes.io/docs/concepts/storage/persistent-volumes/"
  },
  {
    "id": "K8S-065",
    "topic": "Kubernetes",
    "section": "storage",
    "level": "senior",
    "question": "Чем VolumeSnapshot отличается от полноценного резервного копирования PostgreSQL?",
    "answer": "CSI snapshot фиксирует состояние volume в соответствии с возможностями backend. Он может быть crash-consistent, но не гарантирует согласованность нескольких томов или прикладных транзакций. PostgreSQL backup требует согласованной стратегии базовой копии и WAL либо корректно подготовленного снимка с проверкой восстановления. Snapshot в том же storage domain не защищает от всех отказов.",
    "follow_up": "Когда нужен application quiesce? Как проверить RPO при восстановлении?",
    "practice": "В изолированной БД восстановить тестовую копию и проверить контрольные записи и консистентность.",
    "rubric": "Отличать snapshot от application-consistent backup, требовать restore drill.",
    "source": "https://kubernetes.io/docs/concepts/storage/volume-snapshots/"
  },
  {
    "id": "K8S-066",
    "topic": "Kubernetes",
    "section": "storage",
    "level": "senior",
    "question": "Почему local PersistentVolume ограничивает восстановление после потери узла?",
    "answer": "Local PV привязан к определённому узлу через node affinity, поскольку физические данные находятся локально. Scheduler должен разместить потребитель там, где доступен том. При отказе узла простое пересоздание Pod на другом узле не переносит данные. Нужны прикладная репликация, backup или подходящий распределённый backend.",
    "follow_up": "Чем local PV отличается от hostPath? Как избежать ошибочного назначения тома в другой зоне?",
    "practice": "Проверить nodeAffinity PV, состояние узла и тест восстановления данных из независимой копии.",
    "rubric": "Не считать PVC механизмом миграции данных, учитывать failure domain.",
    "source": "https://kubernetes.io/docs/concepts/storage/volumes/"
  },
  {
    "id": "K8S-067",
    "topic": "Kubernetes",
    "section": "operations",
    "level": "senior",
    "question": "Что делает kubectl cordon и чем отличается drain?",
    "answer": "Cordon отмечает узел unschedulable, чтобы обычное новое размещение не выполнялось. Drain дополнительно пытается удалить или эвиктить существующие workload Pod по правилам команды и Eviction API, учитывая PDB и исключения. DaemonSet, mirror Pod и локальные данные требуют отдельного внимания. Drain не означает остановку самого узла.",
    "follow_up": "Почему --ignore-daemonsets не удаляет DaemonSet? Как обработать emptyDir без потери нужных данных?",
    "practice": "На выделенном Kind-узле проверить состояние scheduling, список Pod и dry-run drain перед операцией.",
    "rubric": "Различать запрет scheduling и выселение; не использовать force/delete-emptydir-data без анализа.",
    "source": "https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/"
  },
  {
    "id": "K8S-068",
    "topic": "Kubernetes",
    "section": "operations",
    "level": "lead",
    "question": "Как спланировать обновление kubeadm-кластера на следующую minor версию?",
    "answer": "Проверить поддерживаемую последовательность и version skew, совместимость CNI, CSI, CRD, admission webhooks и клиентов. Подготовить проверенные backup etcd и конфигураций, staging upgrade и критерии остановки. Обновлять control plane и узлы согласно документации конкретной версии, дренировать узлы по очереди и контролировать доступность workload. Downgrade не считать простым rollback.",
    "follow_up": "Как проверить удалённые API версии? Как учесть PDB и свободную ёмкость при обновлении узла?",
    "practice": "Проверить kubeadm upgrade plan на учебном кластере, dry-run и состояние компонентов после этапов.",
    "rubric": "Версионная совместимость, последовательность, запас capacity и проверяемый recovery plan.",
    "source": "https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-upgrade/"
  },
  {
    "id": "K8S-069",
    "topic": "Kubernetes",
    "section": "operations",
    "level": "senior",
    "question": "Почему успешный kubeadm certs renew не гарантирует немедленное восстановление API?",
    "answer": "Renew обновляет управляемые kubeadm сертификаты, но работающие процессы могут продолжать использовать старые данные до перезапуска или reload. Нужно выяснить, какие сертификаты истекли, какие компоненты их потребляют и управляются ли они внешним CA. На HA control plane обновлять компоненты контролируемо, проверяя доступность и kubeconfig клиентов.",
    "follow_up": "Как отличается ротация kubelet client certificate? Почему нельзя одновременно перезапустить весь control plane?",
    "practice": "kubeadm certs check-expiration на учебном control plane; проверить сроки сертификатов и /readyz.",
    "rubric": "Различать обновление файлов, загрузку сертификатов процессами и HA процедуру.",
    "source": "https://kubernetes.io/docs/tasks/administer-cluster/kubeadm/kubeadm-certs/"
  },
  {
    "id": "K8S-070",
    "topic": "Kubernetes",
    "section": "operations",
    "level": "lead",
    "question": "Как проверить доступность Kubernetes API отдельно от доступности его зависимостей?",
    "answer": "Используй /livez для жизнеспособности процесса и /readyz для способности обслуживать запросы; подробные проверки могут показать состояние etcd и post-start hooks. Отдельно измеряй latency и ошибки реальных API операций, состояние балансировщика и etcd. HTTP 200 одного health endpoint не доказывает здоровье всех API server или пользовательского трафика.",
    "follow_up": "Когда readiness должна исключать API server из балансировщика? Какие проверки недоступны без нужных прав?",
    "practice": "kubectl get --raw='/readyz?verbose' в тестовом кластере; сравнить экземпляры и latency API.",
    "rubric": "Различать liveness, readiness, зависимости и SLI; не полагаться на одиночный health check.",
    "source": "https://kubernetes.io/docs/reference/using-api/health-checks/"
  },
  {
    "id": "K8S-071",
    "topic": "Kubernetes",
    "section": "resources",
    "level": "senior",
    "question": "У Pod два обычных init-контейнера с requests 2 и 4 CPU, а два app-контейнера запрашивают 1 CPU каждый. Каков эффективный CPU request?",
    "answer": "При обычных init-контейнерах без restartable sidecars учитывается максимум из максимального request init-контейнеров и суммы app-контейнеров: max(4,2)=4 CPU. Добавляется Pod overhead, если он задан. Расчёт выполняется отдельно для каждого ресурса. Init-контейнер с высоким request может препятствовать размещению даже при небольшой постоянной нагрузке.",
    "follow_up": "Что изменится при restartable init sidecar? Как оптимизировать ресурсоёмкую инициализацию?",
    "practice": "Проверить requests initContainers и containers, Pod overhead и события FailedScheduling.",
    "rubric": "Рассчитать 4 CPU без overhead; не суммировать последовательно выполняющиеся init-контейнеры.",
    "source": "https://kubernetes.io/docs/concepts/workloads/pods/init-containers/"
  },
  {
    "id": "K8S-072",
    "topic": "Kubernetes",
    "section": "resources",
    "level": "senior",
    "question": "Как ResourceQuota может заблокировать создание Pod при достаточном количестве свободных ресурсов на узлах?",
    "answer": "ResourceQuota ограничивает суммарное потребление ресурсов или количество объектов в namespace на уровне admission. При превышении квоты создание Pod отклоняется до размещения scheduler. Deployment может существовать, но ReplicaSet не создаст требуемые Pod. Проверяй запросы и лимиты, уже учтённое потребление и события контроллера.",
    "follow_up": "Чем quota отличается от node capacity? Что произойдёт при maxSurge во время rollout?",
    "practice": "kubectl describe quota -n demo; kubectl describe rs -n demo; проверить сообщение exceeded quota.",
    "rubric": "Различать admission и scheduling, учитывать временные реплики при обновлении.",
    "source": "https://kubernetes.io/docs/concepts/policy/resource-quotas/"
  },
  {
    "id": "K8S-073",
    "topic": "Kubernetes",
    "section": "resources",
    "level": "middle",
    "question": "Для чего нужен LimitRange, если namespace уже ограничен ResourceQuota?",
    "answer": "LimitRange задаёт ограничения и значения по умолчанию для отдельных ресурсов Pod, контейнера или PVC в namespace. ResourceQuota ограничивает суммарные величины. Вместе они предотвращают как некорректные размеры отдельных workload, так и превышение общего бюджета. Существующие Pod не получают новые значения автоматически.",
    "follow_up": "Почему default limit может неожиданно влиять на scheduling? Что происходит при запросе выше max?",
    "practice": "На учебном namespace сравнить server-side dry-run Pod без requests до и после LimitRange.",
    "rubric": "Объяснить индивидуальные и агрегатные ограничения, admission defaults и scope.",
    "source": "https://kubernetes.io/docs/concepts/policy/limit-range/"
  },
  {
    "id": "K8S-074",
    "topic": "Kubernetes",
    "section": "resources",
    "level": "senior",
    "question": "Как Pod overhead влияет на ёмкость пула с sandboxed runtime?",
    "answer": "RuntimeClass может задавать дополнительный расход CPU и памяти на инфраструктуру Pod, например отдельную виртуальную среду. Этот overhead учитывается сверх эффективных requests при scheduling и в соответствующих механизмах учёта ресурсов. Для плотного размещения множества мелких Pod накладные расходы могут быть существенными.",
    "follow_up": "Как пересчитать capacity для 100 Pod с overhead 50m CPU и 64Mi каждый? Где задаётся overhead?",
    "practice": "Проверить RuntimeClass и spec.overhead созданных Pod; сравнить суммарные requests узла.",
    "rubric": "Учитывать дополнительные 5 CPU и 6400 Mi без двойного учёта.",
    "source": "https://kubernetes.io/docs/concepts/scheduling-eviction/pod-overhead/"
  },
  {
    "id": "K8S-075",
    "topic": "Kubernetes",
    "section": "resources",
    "level": "senior",
    "question": "Как Kubernetes учитывает ephemeral-storage и почему это не PVC?",
    "answer": "Локальное ephemeral-storage включает учитываемые writable layers, контейнерные логи и дисковые emptyDir. Requests помогают scheduler учитывать ёмкость; лимиты и node-pressure eviction могут приводить к выселению при превышении условий. Это не устойчивое хранилище и не резервирование отдельного дискового тома. Учёт зависит от поддерживаемой конфигурации файловой системы узла.",
    "follow_up": "Как отличается emptyDir на tmpfs? Почему quota ephemeral-storage может не работать ожидаемо без requests/limits?",
    "practice": "Проверить node allocatable, container resources, emptyDir и события eviction на тестовом узле.",
    "rubric": "Различать локальный учёт и persistent storage, не обещать гарантированную изоляцию I/O.",
    "source": "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/"
  },
  {
    "id": "K8S-076",
    "topic": "Kubernetes",
    "section": "resources",
    "level": "senior",
    "question": "Как Pod с native sidecar завершает Job после окончания основного контейнера?",
    "answer": "Native sidecar определяется как init container с restartPolicy Always в поддерживаемой версии Kubernetes. Он запускается в ходе инициализации и продолжает работать параллельно с приложением; его работа не должна удерживать завершённую Job бесконечно. Обычный дополнительный app-контейнер, напротив, может мешать завершению Pod, пока он не выйдет.",
    "follow_up": "Как контролируется порядок запуска? Как учесть requests sidecar вместе с init-контейнерами?",
    "practice": "В учебном кластере поддерживаемой версии запустить Job с native sidecar и проверить Complete и завершение контейнеров.",
    "rubric": "Различать обычный sidecar и native sidecar, проверить версию и lifecycle.",
    "source": "https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/"
  },
  {
    "id": "K8S-077",
    "topic": "Kubernetes",
    "section": "security",
    "level": "senior",
    "question": "Почему runAsNonRoot не заменяет allowPrivilegeEscalation: false?",
    "answer": "runAsNonRoot требует запуск контейнера не от UID 0. allowPrivilegeEscalation управляет возможностью получения дополнительных привилегий процессом через механизмы ОС и связано с no_new_privs, с оговорками для privileged и некоторых capabilities. Это разные уровни защиты; также нужны минимальные capabilities, seccomp и подходящие права файлов.",
    "follow_up": "Почему USER в Dockerfile недостаточен как политика кластера? Что проверить в securityContext контейнера?",
    "practice": "На учебном Pod проверить UID процесса, admission ограничения и effective securityContext.",
    "rubric": "Не путать начальный UID с последующим повышением привилегий.",
    "source": "https://kubernetes.io/docs/tasks/configure-pod-container/security-context/"
  },
  {
    "id": "K8S-078",
    "topic": "Kubernetes",
    "section": "security",
    "level": "senior",
    "question": "Чем seccomp отличается от Linux capabilities в securityContext?",
    "answer": "Capabilities разделяют привилегии ядра, например отдельные права на сетевые операции. Seccomp фильтрует системные вызовы. Удаление capabilities не блокирует все опасные syscall, а seccomp не заменяет контроль UID, файловой системы и прав API. Настраивать профиль нужно с учётом runtime и требований приложения.",
    "follow_up": "Что означает RuntimeDefault? Как диагностировать отказ операции после hardening?",
    "practice": "На учебном контейнере сравнить securityContext, CapEff и диагностические сообщения приложения.",
    "rubric": "Объяснить различные механизмы защиты, минимизировать исключения и проверять совместимость.",
    "source": "https://kubernetes.io/docs/tutorials/security/seccomp/"
  },
  {
    "id": "K8S-079",
    "topic": "Kubernetes",
    "section": "security",
    "level": "senior",
    "question": "Почему readOnlyRootFilesystem может сломать приложение, даже если оно не пишет пользовательские данные?",
    "answer": "Runtime-приложение может записывать временные файлы, кеш, PID-файлы или служебные данные. Read-only root filesystem запрещает запись в корневой слой, но разрешённые отдельные volumes остаются доступными для записи. Определи реальные writable paths, добавь минимальные mounts с ограничениями и проверь запуск и обработку запросов.",
    "follow_up": "Чем emptyDir отличается от writable root layer? Где хранить устойчивые данные?",
    "practice": "В учебном Pod включить readOnlyRootFilesystem и проверить пути /tmp и другие необходимые директории.",
    "rubric": "Не отключать защиту целиком при первой ошибке; выделить минимальные writable paths.",
    "source": "https://kubernetes.io/docs/tasks/configure-pod-container/security-context/"
  },
  {
    "id": "K8S-080",
    "topic": "Kubernetes",
    "section": "security",
    "level": "senior",
    "question": "Как настроить аудит Kubernetes, чтобы установить, кто изменил Deployment, не записывая секреты в журнал?",
    "answer": "Audit policy выбирает события по субъектам, verbs, ресурсам и namespace и определяет уровень записываемых данных. Metadata часто достаточно для идентификации запроса; для отдельных безопасных ресурсов можно ограниченно использовать Request или RequestResponse. Secret и чувствительные payload требуют минимизации. Журналы нужно защищать, ротировать и хранить независимо от проверяемого workload.",
    "follow_up": "Чем Metadata отличается от RequestResponse? Почему аудит не доказывает намерения пользователя?",
    "practice": "На тестовом API выполнить изменение Deployment и проверить audit event, user, verb, objectRef и responseStatus.",
    "rubric": "Назвать уровни аудита, корреляцию и риск записи чувствительных данных.",
    "source": "https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/"
  },
  {
    "id": "K8S-081",
    "topic": "Kubernetes",
    "section": "security",
    "level": "senior",
    "question": "Как проверить права на exec в Pod отдельно от прав чтения Pod?",
    "answer": "Exec использует подресурс pods/exec, а обычное чтение Pod относится к pods. RBAC различает resources, subresources и verbs. Нужный verb зависит от способа обращения клиента к API. Проверяй доступ конкретной identity и используемого метода, не предоставляй расширенные права на весь namespace только ради диагностики.",
    "follow_up": "Зачем отдельно контролировать pods/log и pods/portforward? Как учитывать аудит exec?",
    "practice": "kubectl auth can-i create pods --subresource=exec -n demo --as=system:serviceaccount:demo:reader; проверить также фактический клиент.",
    "rubric": "Различать права на объект и подресурсы, применять least privilege.",
    "source": "https://kubernetes.io/docs/reference/access-authn-authz/rbac/"
  },
  {
    "id": "K8S-082",
    "topic": "Kubernetes",
    "section": "security",
    "level": "lead",
    "question": "Как спроектировать изоляцию нескольких команд в одном Kubernetes-кластере?",
    "answer": "Namespace задаёт удобную административную границу, но сам по себе не является жёсткой границей безопасности. Нужны раздельные identities и RBAC, NetworkPolicy с проверенным CNI, quotas и admission constraints, контролируемые cluster-scoped ресурсы и общий процесс управления секретами. Для недоверенных арендаторов оценить необходимость отдельных кластеров или sandboxed runtime.",
    "follow_up": "Как предотвратить noisy neighbor? Кто может создавать CRD и ClusterRoleBinding?",
    "practice": "На тестовых namespaces проверить запрещённые API действия, сетевые соединения и пределы потребления.",
    "rubric": "Сформировать многослойную модель изоляции; явно назвать shared control plane и ограничения.",
    "source": "https://kubernetes.io/docs/concepts/security/multi-tenancy/"
  },
  {
    "id": "K8S-083",
    "topic": "Kubernetes",
    "section": "security",
    "level": "senior",
    "question": "Почему imagePullPolicy Always не делает развёртывание воспроизводимым?",
    "answer": "Always заставляет kubelet разрешать имя образа через registry при запуске контейнера, но изменяемый тег может указывать на разные digest в разное время. При использовании digest фиксируются байты соответствующего образа; кеширование слоёв при этом возможно. Отдельно нужны проверки происхождения, подписи, сканирования и доступности registry.",
    "follow_up": "Что произойдёт с уже запущенными Pod при изменении тега? Как проверить фактически запущенный imageID?",
    "practice": "kubectl get pod demo -o jsonpath='{.status.containerStatuses[*].imageID}'; сравнить с digest артефакта.",
    "rubric": "Различать pull policy, тег, digest и воспроизводимость.",
    "source": "https://kubernetes.io/docs/concepts/containers/images/"
  },
  {
    "id": "K8S-084",
    "topic": "Kubernetes",
    "section": "security",
    "level": "senior",
    "question": "Почему imagePullSecret не следует использовать как универсальный токен приложения?",
    "answer": "ImagePullSecret содержит registry credentials для скачивания образа и должен быть доступен в соответствующем namespace. Приложению нужны отдельные credentials с другим назначением и правами. Разделение снижает последствия компрометации. При поддержке конкретной версии и инфраструктуры можно использовать credential provider вместо долгоживущих ключей.",
    "follow_up": "Как привязать imagePullSecrets через ServiceAccount? Что проверять при отказе авторизации registry?",
    "practice": "На учебном namespace проверить ссылки на Secret, события image pull и права registry, не выводя секретные значения.",
    "rubric": "Различать registry authentication и application identity; ограничить scope и срок жизни.",
    "source": "https://kubernetes.io/docs/concepts/containers/images/"
  },
  {
    "id": "K8S-085",
    "topic": "Kubernetes",
    "section": "api",
    "level": "senior",
    "question": "Чем kubectl apply --dry-run=client отличается от --dry-run=server?",
    "answer": "Client dry-run формирует запрос локально без выполнения серверной операции создания или изменения. Server dry-run отправляет запрос API server, где выполняются применимые проверки, defaulting и admission, но результат не сохраняется. Он требует доступа к кластеру и соответствующих прав. Успех не доказывает scheduling, image pull и готовность приложения.",
    "follow_up": "Почему webhook может отклонить dry-run? Как проверить фактические defaults?",
    "practice": "Сравнить вывод обоих вариантов для одного учебного manifest, включая admission policy.",
    "rubric": "Различать локальную и серверную валидацию, не считать dry-run тестом runtime.",
    "source": "https://kubernetes.io/docs/reference/using-api/api-concepts/"
  },
  {
    "id": "K8S-086",
    "topic": "Kubernetes",
    "section": "api",
    "level": "senior",
    "question": "Зачем API Priority and Fairness при перегрузке API server?",
    "answer": "APF классифицирует запросы по FlowSchema и PriorityLevelConfiguration, распределяет доступ к обработке и при необходимости ставит запросы в очередь или отклоняет их. Это снижает риск, что один интенсивный клиент вытеснит другие критичные потоки. Механизм не увеличивает физическую ёмкость etcd или API server; некоторые виды долгих запросов имеют отдельное поведение.",
    "follow_up": "Как отличить throttling клиента от серверного HTTP 429? Что измерить перед изменением конфигурации?",
    "practice": "Проверить apiserver flowcontrol metrics, request duration, HTTP 429 и клиентские rate limits.",
    "rubric": "Различать справедливое распределение и capacity, учитывать критические клиенты.",
    "source": "https://kubernetes.io/docs/concepts/cluster-administration/flow-control/"
  },
  {
    "id": "K8S-087",
    "topic": "Kubernetes",
    "section": "api",
    "level": "senior",
    "question": "Что происходит при удалении CRD, у которой есть созданные custom resources?",
    "answer": "Удаление CRD удаляет API endpoint соответствующего типа и приводит к удалению объектов этого custom resource. Повторное создание CRD не восстанавливает автоматически прежние объекты. Внешние ресурсы оператора требуют отдельного анализа, поскольку их жизненный цикл зависит от логики контроллера и финализаторов.",
    "follow_up": "Почему uninstall оператора и удаление CRD — разные операции? Как подготовить rollback миграции CRD?",
    "practice": "На изолированном стенде экспортировать синтетические CR, проверить restore и порядок удаления контроллера.",
    "rubric": "Осознавать риск потери объектов, обеспечить backup и план восстановления внешнего состояния.",
    "source": "https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/"
  },
  {
    "id": "K8S-088",
    "topic": "Kubernetes",
    "section": "operations",
    "level": "senior",
    "question": "Почему kubeadm control plane может запускаться, когда API server ещё недоступен?",
    "answer": "Kubeadm обычно использует static Pod manifests, которые kubelet читает локально. Для запуска таких Pod не требуется создать их через работающий API server. Kubelet пытается представить static Pod в API через mirror Pod, когда связь доступна. Удаление mirror Pod не является способом остановить исходный static Pod.",
    "follow_up": "Где искать логи при неработающем API? Почему копию манифеста нельзя оставлять в watched directory?",
    "practice": "На выделенном kubeadm-стенде проверить kubelet, crictl ps -a и локальные static manifests без редактирования production.",
    "rubric": "Понимать bootstrap и разницу между локальным manifest и mirror object.",
    "source": "https://kubernetes.io/docs/concepts/workloads/pods/static-pods/"
  },
  {
    "id": "K8S-089",
    "topic": "Kubernetes",
    "section": "operations",
    "level": "senior",
    "question": "Какую роль выполняют CRI, CNI и CSI и где искать причину ContainerCreating?",
    "answer": "CRI связывает kubelet с container runtime, CNI обеспечивает настройку сети Pod через реализацию сетевого плагина, CSI стандартизирует взаимодействие со storage drivers. ContainerCreating может скрывать сбой создания sandbox, настройки сети, монтирования volume или загрузки образа. Проверяй события и логи соответствующего компонента, а не перезапускай весь кластер.",
    "follow_up": "Чем FailedCreatePodSandBox отличается от FailedMount? Почему Docker CLI может не показать контейнеры Kubernetes?",
    "practice": "На учебном узле проверить kubectl describe pod, crictl pods/ps и логи kubelet/CNI/CSI.",
    "rubric": "Различить три интерфейса и диагностировать конкретный этап lifecycle.",
    "source": "https://kubernetes.io/docs/setup/production-environment/container-runtimes/",
    "source_prompts": [
      {
        "number": 66,
        "question": "Container Network Interface (CNI)."
      }
    ]
  },
  {
    "id": "K8S-090",
    "topic": "Kubernetes",
    "section": "operations",
    "level": "lead",
    "question": "Как проверить резервную копию etcd для восстановления Kubernetes-кластера?",
    "answer": "Снимок etcd должен быть доступен, целостен и соответствовать процедуре восстановления используемой версии. Проверить восстановление в независимом окружении, состояние API и ключевых объектов, доступность PKI и конфигураций control plane. Отдельно резервировать прикладные данные вне etcd. RPO определяется временем и содержимым копии, RTO — измеренным временем восстановления сервиса.",
    "follow_up": "Почему snapshot etcd не содержит данные PV? Как учесть устаревшие watch caches и revision при restore?",
    "practice": "На отдельном тестовом кластере выполнить документированный restore, проверить API readiness и контрольные объекты; записать время и потерю изменений.",
    "rubric": "Не восстанавливать поверх работающего production без плана; отличать control plane от данных приложений.",
    "source": "https://kubernetes.io/docs/tasks/administer-cluster/configure-upgrade-etcd/"
  },
  {
    "id": "K8S-091",
    "topic": "Kubernetes",
    "section": "operations",
    "level": "senior",
    "question": "Как диагностировать медленный kube-apiserver при нормальном CPU?",
    "answer": "Раздели время обработки между очередями API, admission webhooks, чтением/записью etcd и сетевыми задержками. Сравни latency по verb/resource, HTTP errors, число in-flight запросов, etcd fsync/commit latency и webhook duration. Массовые LIST или чрезмерный churn объектов могут создавать нагрузку даже при невысоком среднем CPU.",
    "follow_up": "Почему средняя задержка скрывает проблему отдельных ресурсов? Как определить виновный клиент без раскрытия чувствительных данных?",
    "practice": "Сопоставить API request duration, flowcontrol, etcd metrics и безопасно настроенный audit.",
    "rubric": "Использовать разрезы запросов и dependency latency; не делать вывод только по CPU.",
    "source": "https://kubernetes.io/docs/concepts/cluster-administration/flow-control/"
  },
  {
    "id": "K8S-092",
    "topic": "Kubernetes",
    "section": "operations",
    "level": "lead",
    "question": "Как выбрать между одним большим Kubernetes-кластером и несколькими независимыми?",
    "answer": "Большой кластер улучшает совместное использование ёмкости и уменьшает число control plane, но расширяет общий домен отказа и сложность tenancy. Независимые кластеры изолируют обновления, аварии и требования безопасности, увеличивая операционные расходы и необходимость стандартизации. Сравнивай SLO, доверие арендаторов, географию, capacity, RTO, стоимость и зрелость команды.",
    "follow_up": "Что произойдёт при отказе общего admission webhook? Как избежать конфигурационного drift между кластерами?",
    "practice": "Составить ADR с отказом control plane, обновлением и стоимостью поддержки; проверить сценарий восстановления на стенде.",
    "rubric": "Назвать конкретные tradeoffs и failure domains, не выбирать архитектуру только по числу Pod.",
    "source": "https://kubernetes.io/docs/concepts/security/multi-tenancy/"
  },
  {
    "id": "K8S-093",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Почему DNS-имя Service разрешается, но соединение с ним получает timeout?",
    "answer": "Успешное DNS разрешение подтверждает обнаружение имени, не доступность backend. Сначала проверь адрес и порт Service, затем readiness и EndpointSlice, прямой доступ к backend из разрешённого тестового Pod и NetworkPolicy. Если backend доступен напрямую, исследуй Service dataplane. Таймаут не определяет единственную причину.",
    "follow_up": "Как отличить timeout от TCP reset? Почему DNS кеш может вводить в заблуждение?",
    "practice": "Из выделенного диагностического Pod выполнить DNS lookup и TCP/HTTP проверку Service и выбранного endpoint.",
    "rubric": "Локализовать DNS, TCP, policy и backend раздельно; не перезапускать CoreDNS только по timeout.",
    "source": "https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/"
  },
  {
    "id": "K8S-094",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Когда Service без selector используют для подключения внешней системы?",
    "answer": "Service без selector позволяет представить backend, не управляемый обычным выбором Pod. EndpointSlice создаётся отдельно с адресами и портами соответствующей системы и меткой принадлежности Service. Нужно обеспечить достижимость адресов, их актуализацию и ограничения безопасности. Kubernetes не станет автоматически отслеживать readiness произвольной внешней системы.",
    "follow_up": "Чем отличается ExternalName? Почему нельзя использовать произвольный адрес без проверки маршрутов?",
    "practice": "В изолированной сети создать тестовый Service без selector и EndpointSlice для контролируемого backend.",
    "rubric": "Объяснить ручное управление endpoints и отличие DNS alias от Service dataplane.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/service/"
  },
  {
    "id": "K8S-095",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Какие риски создаёт hostNetwork: true и когда он оправдан?",
    "answer": "Pod использует сетевое пространство узла вместо обычного отдельного Pod network namespace. Это может быть необходимо инфраструктурным компонентам, но создаёт конфликты портов, расширяет сетевую видимость и меняет предположения об изоляции. Поведение NetworkPolicy для hostNetwork зависит от реализации; DNS policy требует отдельного внимания.",
    "follow_up": "Зачем ClusterFirstWithHostNet? Как избежать конфликта при нескольких экземплярах агента?",
    "practice": "На учебном узле проверить listeners, DNS policy и правила admission до запуска hostNetwork Pod.",
    "rubric": "Понимать изменение network namespace и ограничивать использование инфраструктурными задачами.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/"
  },
  {
    "id": "K8S-096",
    "topic": "Kubernetes",
    "section": "storage",
    "level": "senior",
    "question": "Как StatefulSet управляет PVC, когда количество реплик уменьшается?",
    "answer": "Тома, созданные через volumeClaimTemplates, обычно сохраняются после уменьшения реплик или удаления StatefulSet по умолчанию. Поддерживаемая политика persistentVolumeClaimRetentionPolicy позволяет изменить поведение для удаления или scale down. Реальная судьба backend затем зависит от PV reclaimPolicy. Нужно проверять обе политики и резервные копии.",
    "follow_up": "Как отличить whenScaled и whenDeleted? Что произойдёт с прежним PVC при обратном scale up?",
    "practice": "На учебном StatefulSet сравнить PVC до и после scale down и повторного scale up с выбранной retention policy.",
    "rubric": "Различать retention PVC и reclaim PV, не обещать автоматическое сохранение при любой конфигурации.",
    "source": "https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/"
  },
  {
    "id": "K8S-097",
    "topic": "Kubernetes",
    "section": "storage",
    "level": "senior",
    "question": "Как CSI topology влияет на доступность stateful приложения при отказе зоны?",
    "answer": "Zonal volume может быть доступен только узлам своей зоны, что ограничивает возможное размещение потребителя после аварии. WaitForFirstConsumer согласует первоначальное provisioning с scheduling, но не реплицирует данные в другие зоны. Для межзонного восстановления нужен поддерживающий это backend, прикладная репликация или проверенный restore.",
    "follow_up": "Почему три реплики в одной зоне не дают zone HA? Как измерить время attach после восстановления?",
    "practice": "Проверить PV nodeAffinity, StorageClass и ограничения драйвера; спланировать потерю зоны на изолированном стенде.",
    "rubric": "Различать первоначальную топологию и фактическую репликацию данных.",
    "source": "https://kubernetes.io/docs/concepts/storage/storage-classes/"
  },
  {
    "id": "K8S-098",
    "topic": "Kubernetes",
    "section": "design",
    "level": "lead",
    "question": "Как рассчитать ресурсный запас для Deployment из 12 реплик при потере одного из трёх равных пулов?",
    "answer": "Если целевая нагрузка требует 12 реплик, в норме можно распределить их по 4 на пул. После потери одного пула остаются 8; для восстановления до 12 нужно место ещё для 4 в оставшихся пулах. Если каждая реплика требует 500m CPU и 512Mi, это минимум 2 CPU и 2048Mi свободного allocatable по requests, без учёта системных Pod, surge и ограничений размещения. Нужны измерения SLO на период восстановления.",
    "follow_up": "Как меняется запас при одновременном rollout с maxSurge=2? Что если storage привязан к отказавшей зоне?",
    "practice": "Составить таблицу capacity по пулам и проверить размещение и нагрузку при симулированном отказе.",
    "rubric": "Рассчитать запас и учесть topology, время восстановления и неопределённость реальной нагрузки.",
    "source": "https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/",
    "source_prompts": [
      {
        "number": 81,
        "question": "Если у тебя high-availability приложение, как ты будешь реализовывать скейлинг приложений в кластере?"
      }
    ]
  },
  {
    "id": "K8S-099",
    "topic": "Kubernetes",
    "section": "design",
    "level": "lead",
    "question": "Как организовать безопасную миграцию приложения между двумя Kubernetes-кластерами без общей точки отката?",
    "answer": "Подготовь целевой кластер и совместимые зависимости, воспроизводимую конфигурацию и неизменяемый артефакт. Для данных определяй механизм синхронизации, допустимый RPO и защиту от двух активных writer. Переключай трафик постепенно или контролируемым cutover, сравнивай SLI и целостность данных. Условия rollback должны учитывать изменения, сделанные после переключения.",
    "follow_up": "Как проверить готовность DNS/LB и TTL? При каких условиях обратное переключение потребует отдельной миграции данных?",
    "practice": "На двух локальных тестовых кластерах отработать перенос stateless сервиса и отдельно описать stateful cutover с контрольными записями.",
    "rubric": "Разделить перенос workload, трафика и данных, определить fencing и критерии приёмки.",
    "source": "https://kubernetes.io/docs/concepts/cluster-administration/"
  },
  {
    "id": "K8S-100",
    "topic": "Kubernetes",
    "section": "design",
    "level": "lead",
    "question": "Как оценить готовность к production Kubernetes-платформы перед передачей её командам разработки?",
    "answer": "Определи проверяемые требования: доступность control plane и workloads, изоляция, delivery, observability, capacity, upgrade и DR. Для каждой группы нужен владелец, runbook и тест отказа с наблюдаемыми результатами. Проверить RBAC и admission на отрицательных сценариях, restore данных и конфигурации, нагрузку и обновление узлов. Успех kubectl get nodes не является приёмкой платформы.",
    "follow_up": "Какие результаты являются блокирующими? Как оформить SLO платформы и исключения для пилота?",
    "practice": "Собрать release checklist, результаты нагрузочных и аварийных тестов, ADR и список рисков с владельцами.",
    "rubric": "Требовать объективные доказательства, различать pilot и production readiness.",
    "source": "https://kubernetes.io/docs/setup/production-environment/"
  },
  {
    "id": "K8S-101",
    "topic": "Kubernetes",
    "section": "architecture",
    "level": "middle",
    "question": "Из каких компонентов состоит Kubernetes-кластер и как распределены их функции?",
    "answer": "Control plane принимает решения и хранит состояние: API server обслуживает API, etcd хранит данные API, scheduler назначает узлы, controller-manager запускает контроллеры. На worker-узле kubelet управляет Pod через CRI runtime; сетевой плагин и реализация Service обеспечивают сеть. Размещение компонентов зависит от дистрибутива.",
    "follow_up": "Чем worker отличается от control plane? Где хранится состояние?",
    "practice": "kubectl get nodes -o wide; kubectl get pods -n kube-system; на учебном узле проверить службы kubelet и runtime.",
    "rubric": "Разделить control plane и worker, назвать API server, etcd, scheduler, controllers, kubelet и runtime.",
    "source": "https://kubernetes.io/docs/concepts/architecture/",
    "source_prompts": [
      {
        "number": 1,
        "question": "Из чего состоит Kubernetes (архитектура)?"
      },
      {
        "number": 2,
        "question": "Что такое кластер Kubernetes?"
      },
      {
        "number": 3,
        "question": "Из чего состоит кластер и для чего?"
      },
      {
        "number": 4,
        "question": "Что такое master-ноды и worker-ноды?"
      },
      {
        "number": 6,
        "question": "Где хранится состояние кластера?"
      },
      {
        "number": 11,
        "question": "Расскажи, какие процессы запущены на worker-нодах?"
      }
    ]
  },
  {
    "id": "K8S-102",
    "topic": "Kubernetes",
    "section": "architecture",
    "level": "middle",
    "question": "Сколько control-plane узлов нужно для отказоустойчивого кластера и почему?",
    "answer": "Один control-plane узел подходит для учебного стенда, но является точкой отказа. Типичный HA kubeadm с colocated etcd использует три узла: большинство из трёх составляет два, допускается потеря одного. Внешний etcd проектируется отдельно. Требуются независимые домены отказа и доступный endpoint API; нечётное число относится прежде всего к голосующим членам etcd. Etcd — распределённое key-value хранилище с консенсусом Raft, используемое Kubernetes для сохранения состояния API.",
    "follow_up": "Что дают два члена etcd? Можно ли иметь два API server с отдельным etcd из трёх?",
    "practice": "На тестовой схеме рассчитать кворум для 1, 2, 3 и 5 членов etcd.",
    "rubric": "Не смешивать число API server и quorum etcd; объяснить почему 2 члена не выдерживают потерю одного.",
    "source": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/ha-topology/",
    "source_prompts": [
      {
        "number": 5,
        "question": "Сколько master-нод в кластере должно быть и почему?"
      },
      {
        "number": 7,
        "question": "Что такое etcd?"
      }
    ]
  },
  {
    "id": "K8S-103",
    "topic": "Kubernetes",
    "section": "architecture",
    "level": "middle",
    "question": "Что делает kubelet и как он взаимодействует с API server и container runtime?",
    "answer": "Kubelet работает на узле и следит за назначенными ему Pod, поручает CRI runtime запуск контейнеров, организует необходимые mounts, проверки здоровья и сообщает status и heartbeat. Он не выбирает узлы для обычных Pod и не управляет числом реплик Deployment. При сбое kubelet контейнеры не обязательно прекращают работу немедленно.",
    "follow_up": "Как проверить состояние kubelet и runtime? Что такое Node Lease?",
    "practice": "На локальном стенде: systemctl status kubelet; journalctl -u kubelet; crictl ps -a.",
    "rubric": "Назвать обязанности агента узла, CRI и обратную связь с API.",
    "source": "https://kubernetes.io/docs/concepts/architecture/nodes/",
    "source_prompts": [
      {
        "number": 8,
        "question": "Что за компонент Kubelet?"
      }
    ]
  },
  {
    "id": "K8S-104",
    "topic": "Kubernetes",
    "section": "architecture",
    "level": "senior",
    "question": "Чем scheduler отличается от controller-manager и какие Pod не требуют обычного scheduling?",
    "answer": "Scheduler назначает ещё не привязанные Pod на подходящие узлы. Controller-manager запускает control loops, например поддержание числа реплик и обработку объектов Node. Static Pod запускается kubelet из локального manifest, а Pod с явно заданным spec.nodeName обходит обычный scheduler. DaemonSet в современных версиях обычно использует scheduler.",
    "follow_up": "Почему нельзя ответить, что DaemonSet всегда обходит scheduler? Что такое mirror Pod?",
    "practice": "Сравнить обычный Deployment, DaemonSet и static Pod на учебной схеме; проверить nodeName.",
    "rubric": "Не путать создание Pod, назначение узла и запуск контейнера.",
    "source": "https://kubernetes.io/docs/concepts/workloads/pods/static-pods/",
    "source_prompts": [
      {
        "number": 9,
        "question": "Чем отличается Scheduler от controller-manager?"
      },
      {
        "number": 10,
        "question": "Для какой абстракции не нужен Kube-scheduler?"
      }
    ]
  },
  {
    "id": "K8S-105",
    "topic": "Kubernetes",
    "section": "architecture",
    "level": "middle",
    "question": "Можно ли запускать пользовательские Pod на control-plane узлах?",
    "answer": "Технически можно, если условия размещения это допускают. kubeadm обычно добавляет taint node-role.kubernetes.io/control-plane:NoSchedule; подходящая toleration разрешает scheduling, но не заставляет выбрать этот узел. На production отделяют ресурсы control plane от пользовательской нагрузки; в одноузловом стенде допустима иная политика.",
    "follow_up": "Как taint отличается от label? Какие риски несёт перегрузка API/etcd?",
    "practice": "На выделенном стенде проверить kubectl describe node и tolerations Pod, не снимать taint с production.",
    "rubric": "Объяснить разрешение, а не необходимость размещения, и риск общей ёмкости.",
    "source": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/",
    "source_prompts": [
      {
        "number": 12,
        "question": "Можно ли размещать на master-node свои поды?"
      }
    ]
  },
  {
    "id": "K8S-106",
    "topic": "Kubernetes",
    "section": "operations",
    "level": "senior",
    "question": "Как развернуть учебный кластер с помощью kubeadm?",
    "answer": "Подготовить Linux-узлы, совместимые версии kubeadm/kubelet/kubectl и CRI runtime, настроить сеть, cgroups и требования ОС. Выполнить kubeadm init на control plane, настроить kubeconfig, установить совместимый CNI и присоединить worker через kubeadm join. Проверить Ready узлов, DNS и тестовый workload. Для HA отдельно подготовить endpoint API и топологию etcd.",
    "follow_up": "Почему после init CoreDNS может быть Pending? Как безопасно обращаться с join token?",
    "practice": "На изолированных VM выполнить официальную процедуру для установленной версии, записать команды и результаты kubectl get nodes.",
    "rubric": "Знать порядок bootstrap, CNI, join и проверку; не выдавать теорию за личный опыт.",
    "source": "https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/create-cluster-kubeadm/",
    "source_prompts": [
      {
        "number": 14,
        "question": "Работали ли вы с kubeadm и как с помощью него развернуть кластер?"
      }
    ]
  },
  {
    "id": "K8S-107",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "middle",
    "question": "Что такое Pod и чем он отличается от контейнера?",
    "answer": "Pod — минимальная единица размещения Kubernetes, включающая один или несколько совместно размещённых контейнеров. Они разделяют сетевой namespace, Pod IP и порты; могут разделять подключённые volumes. Контейнер — отдельный экземпляр выполнения образа с собственными процессами и настройками. У каждого объекта Pod есть UID, а имя и IP не являются постоянной идентичностью после пересоздания.",
    "follow_up": "Почему два контейнера одного Pod общаются через localhost? Что изменится при пересоздании Pod?",
    "practice": "На учебном Pod проверить metadata.uid, status.podIP и связь контейнеров через localhost.",
    "rubric": "Различать Pod и container, общий network namespace и изменяемую идентичность.",
    "source": "https://kubernetes.io/docs/concepts/workloads/pods/",
    "source_prompts": [
      {
        "number": 15,
        "question": "В чем разница между подом и контейнером?"
      },
      {
        "number": 16,
        "question": "Что такое pod, для чего он нужен?"
      },
      {
        "number": 17,
        "question": "Что такое под?"
      },
      {
        "number": 21,
        "question": "Что есть уникального в каждом поде?"
      },
      {
        "number": 117,
        "question": "Если мы запускаем приложение в контейнере, какой-то микросервис, чем будет отличаться под в данном случае?"
      }
    ]
  },
  {
    "id": "K8S-108",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "middle",
    "question": "Сколько контейнеров стоит размещать в Pod и когда несколько оправданы?",
    "answer": "Обычно один основной контейнер на Pod упрощает независимый rollout и scaling. Несколько оправданы при тесно связанном жизненном цикле, например вспомогательный proxy или агент с общим volume. Обычные init-контейнеры завершаются перед запуском приложения; native sidecar работает параллельно в поддерживаемых версиях. Универсального числа контейнеров нет: учитываются ресурсы и ограничения среды.",
    "follow_up": "Почему не помещать независимые frontend и database в один Pod? Все ли контейнеры должны работать постоянно?",
    "practice": "Сравнить Pod с init container и двумя app containers; изучить containerStatuses.",
    "rubric": "Объяснить единицу масштабирования, совместный lifecycle и отличия init/sidecar.",
    "source": "https://kubernetes.io/docs/concepts/workloads/pods/",
    "source_prompts": [
      {
        "number": 18,
        "question": "Сколько контейнеров принято совать в под и почему?"
      },
      {
        "number": 19,
        "question": "Сколько может быть контейнеров внутри пода? Будут ли они работать на постоянке?"
      },
      {
        "number": 20,
        "question": "Какие случаи justify (оправдывают) несколько контейнеров в поде?"
      }
    ]
  },
  {
    "id": "K8S-109",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "middle",
    "question": "Какие ресурсы Kubernetes создают Pod и чем Deployment отличается от ReplicaSet?",
    "answer": "ReplicaSet поддерживает заданное число подходящих Pod. Deployment управляет ReplicaSet и обновлениями шаблона, историей rollout и откатом. DaemonSet создаёт Pod на подходящих узлах, StatefulSet управляет устойчивой идентичностью, Job — выполнением до завершения, CronJob создаёт Job по расписанию. Обычный самостоятельный Pod не обеспечивает замену при удалении. Для обычных stateless-сервисов Deployment является распространённым выбором; не следует считать его единственно допустимым.",
    "follow_up": "Что создаётся при изменении Pod template Deployment? Какой ресурс создаёт Job по расписанию?",
    "practice": "kubectl get deployment,rs,pod -n demo; проверить ownerReferences; сравнить с CronJob.",
    "rubric": "Назвать цепочки Deployment→ReplicaSet→Pod и CronJob→Job→Pod.",
    "source": "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
    "source_prompts": [
      {
        "number": 22,
        "question": "Какие есть объекты, которые создают поды?"
      },
      {
        "number": 23,
        "question": "Какие ты знаешь ресурсы, которыми можно создать под?"
      },
      {
        "number": 24,
        "question": "Какой самый популярный ресурс для создания подов?"
      },
      {
        "number": 25,
        "question": "Какие есть сущности для управления подами?"
      },
      {
        "number": 27,
        "question": "Когда создаешь сущность Deployment, что у тебя происходит? Кого он за собой тащит?"
      },
      {
        "number": 28,
        "question": "Чем отличаются Deployment и ReplicaSet? Почему мы не используем ReplicaSet, если по сути Deployment просто повторяет его функционал?"
      },
      {
        "number": 34,
        "question": "Отличие ReplicaSet, Deployment, StatefulSet и DaemonSet?"
      }
    ]
  },
  {
    "id": "K8S-110",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "middle",
    "question": "Что такое namespace и какие объекты не ограничены namespace?",
    "answer": "Namespace группирует namespaced ресурсы, упрощает разделение команд, имён, прав и квот. Например, Deployment и Service имеют namespace, а Node, PersistentVolume, Namespace и ClusterRole являются cluster-scoped. Namespace сам по себе не запрещает сетевые соединения; нужны RBAC, NetworkPolicy и другие меры.",
    "follow_up": "Могут ли два Service иметь одинаковое имя? Почему нельзя полагаться только на namespace для security isolation?",
    "practice": "kubectl api-resources --namespaced=true; kubectl api-resources --namespaced=false.",
    "rubric": "Различать namespaced и cluster-scoped ресурсы; не обещать изоляцию по одному namespace.",
    "source": "https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/",
    "source_prompts": [
      {
        "number": 37,
        "question": "Что такое namespace, для чего нужен? И почему не складывают все в один namespace?"
      },
      {
        "number": 38,
        "question": "Что такое namespace?"
      }
    ]
  },
  {
    "id": "K8S-111",
    "topic": "Kubernetes",
    "section": "api",
    "level": "middle",
    "question": "Из каких верхнеуровневых полей состоит YAML-манифест и что означает apiVersion?",
    "answer": "Типичный декларативный объект имеет apiVersion, kind, metadata и spec; не у всех ресурсов есть spec, например ConfigMap использует data. apiVersion обозначает группу и версию API: v1 для core, apps/v1 для Deployment, batch/v1 для Job. Alpha и beta версии имеют иной уровень стабильности; выбирать нужно реально поддерживаемую API version.",
    "follow_up": "Почему status обычно не задают вручную? Как проверить доступность API версии и поля?",
    "practice": "kubectl api-resources; kubectl api-versions; kubectl explain deployment.spec; server-side dry-run в учебном namespace.",
    "rubric": "Назвать поля и отличить API group/version от версии Kubernetes или приложения.",
    "source": "https://kubernetes.io/docs/concepts/overview/working-with-objects/",
    "source_prompts": [
      {
        "number": 39,
        "question": "Какие типы apiVersion существуют?"
      },
      {
        "number": 41,
        "question": "Какие есть ключи у yaml-деплоймента в самом верху?"
      }
    ]
  },
  {
    "id": "K8S-112",
    "topic": "Kubernetes",
    "section": "security",
    "level": "middle",
    "question": "Чем Secret отличается от ConfigMap и как передать их приложению?",
    "answer": "ConfigMap предназначен для нечувствительных параметров, Secret — для конфиденциальных данных, например токенов и ключей. Оба могут передаваться через env или volume. Base64 в Secret — кодирование, а не шифрование; необходимы RBAC, шифрование at rest и контроль логов. Env не обновляется автоматически, а mounted файл требует поддержки перечитывания приложением.",
    "follow_up": "Какие данные нельзя класть в Git? Как ротация влияет на env и volume?",
    "practice": "Создать только синтетические ConfigMap и Secret в локальном namespace; проверить ссылки envFrom и volume без вывода значения.",
    "rubric": "Назвать назначение, способы передачи и ограничения безопасности.",
    "source": "https://kubernetes.io/docs/concepts/configuration/secret/",
    "source_prompts": [
      {
        "number": 42,
        "question": "Чем отличается Secret от ConfigMap?"
      },
      {
        "number": 43,
        "question": "Что такое секреты и ConfigMap, разница, где хранить секреты, какие данные в Secrets, как монтируются?"
      }
    ]
  },
  {
    "id": "K8S-113",
    "topic": "Kubernetes",
    "section": "security",
    "level": "senior",
    "question": "Как интегрировать HashiCorp Vault с Kubernetes для выдачи секретов приложению?",
    "answer": "Привязать workload identity к роли Vault с минимальными policy; Kubernetes auth проверяет ServiceAccount token по настройкам Vault. Приложение может получать секрет через Agent Injector, Secrets Store CSI provider либо оператор синхронизации — механизмы и сроки обновления различаются. Нужно определить TTL, ротацию, поведение при недоступности Vault и reload приложения; синхронизация в Kubernetes Secret снова создаёт копию в API.",
    "follow_up": "Чем Agent Injector отличается от CSI? Как избежать постоянного Vault token в образе?",
    "practice": "На изолированном Vault стенде описать role, policy и синтетический secret; проверить отказ чужой identity и ротацию.",
    "rubric": "Объяснить identity, доставку, TTL, ограничения и failover без вывода секретов.",
    "source": "https://developer.hashicorp.com/vault/docs/deploy/kubernetes/comparisons",
    "source_prompts": [
      {
        "number": 44,
        "question": "Хранение секретов в Kubernetes (Vault)."
      }
    ]
  },
  {
    "id": "K8S-114",
    "topic": "Kubernetes",
    "section": "storage",
    "level": "middle",
    "question": "Что такое Volume и чем файловое хранилище отличается от блочного в Kubernetes?",
    "answer": "Volume — доступное контейнерам хранилище, подключаемое к Pod. Файловый backend предоставляет дерево файлов через файловую систему, блочный — устройство блоков, поверх которого можно создать FS или использовать raw block при поддержке CSI и volumeMode: Block. Выбор зависит от access modes, latency, совместного доступа и требований приложения. PVC связывает workload с подходящим persistent volume. В Pod с persistent volume указывают persistentVolumeClaim.claimName, а не имя PV напрямую. Примеры файловых backend: NFS и CephFS; блочных: CSI-драйверы для Ceph RBD или локальных/сетевых дисков. Конкретные возможности проверяются у драйвера.",
    "follow_up": "Можно ли приложению указать PV вместо PVC напрямую в Pod? Чем Filesystem отличается от Block?",
    "practice": "Проверить volumeMode и accessModes тестового PVC; сравнить volumeMounts и volumeDevices в документации.",
    "rubric": "Различать volume API, тип backend, режим доступа и жизненный цикл данных.",
    "source": "https://kubernetes.io/docs/concepts/storage/persistent-volumes/",
    "source_prompts": [
      {
        "number": 46,
        "question": "Для Stateful-приложений нужен PVC или можно сразу PV?"
      },
      {
        "number": 48,
        "question": "Что такое Volume в кубере?"
      },
      {
        "number": 49,
        "question": "Был ли опыт организации хранилища для Kubernetes?"
      },
      {
        "number": 50,
        "question": "Типы файловых хранилищ в кубере."
      },
      {
        "number": 51,
        "question": "Чем отличается блочное хранилище от файлового?"
      }
    ]
  },
  {
    "id": "K8S-115",
    "topic": "Kubernetes",
    "section": "network",
    "level": "middle",
    "question": "Какие четыре типа Service существуют и когда выбирать каждый?",
    "answer": "ClusterIP предоставляет внутренний виртуальный адрес. NodePort публикует порт на узлах. LoadBalancer запрашивает реализацию внешнего балансировщика при наличии соответствующего контроллера. ExternalName возвращает DNS CNAME вместо обычного проксирования. Headless (clusterIP: None) — специальная конфигурация, а не пятый тип. Публикация снаружи требует маршрутизации и политики безопасности.",
    "follow_up": "Почему LoadBalancer может оставаться Pending на bare metal? Что отличается у ExternalName?",
    "practice": "На локальном кластере посмотреть kubectl get svc -o wide и проверить DNS для тестового ExternalName.",
    "rubric": "Назвать четыре типа, отличить headless и потребность в LB implementation.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/service/",
    "source_prompts": [
      {
        "number": 53,
        "question": "Виды сервисов в кубе?"
      },
      {
        "number": 54,
        "question": "Какие типы Kubernetes сервисов ты знаешь?"
      },
      {
        "number": 55,
        "question": "Четыре типа Сервисов в Kubernetes, какие есть, что дают? (ClusterIP, NodePort, LoadBalancer, ExternalName)."
      },
      {
        "number": 59,
        "question": "Варианты, как можно выкинуть приложения наружу?"
      }
    ]
  },
  {
    "id": "K8S-116",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Как провести внешний HTTP-трафик до Pod через Ingress controller?",
    "answer": "Типичная цепочка: DNS → внешний LB или доступный адрес узла → Service контроллера → Ingress dataplane → backend Service/endpoint → приложение. Ingress задаёт Host/path/TLS, а NGINX или Traefik реализует их согласно своим настройкам. В зависимости от контроллера upstream может обращаться непосредственно к endpoint, а не через ClusterIP. Проверяй каждый переход отдельно.",
    "follow_up": "Как установить контроллер в локальном стенде? Где завершается TLS? Почему 502 и 504 требуют разных проверок?",
    "practice": "Использовать учебный controller и Service; проверить curl с корректным Host, events и access/error logs.",
    "rubric": "Различать ресурс, controller и реальный путь трафика; не выдавать конкретную реализацию за универсальную.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/ingress/",
    "source_prompts": [
      {
        "number": 60,
        "question": "Если ты хочешь запустить трафик в Kubernetes извне, какие ты можешь использовать механизмы?"
      },
      {
        "number": 61,
        "question": "Что такое Ingress, NGINX и Traefik?"
      },
      {
        "number": 62,
        "question": "С какими Ingress приходилось работать?"
      },
      {
        "number": 63,
        "question": "Какие были проблемы в использовании Nginx и Traefik?"
      },
      {
        "number": 64,
        "question": "На твоем опыте, как был организован процесс отхода трафика на хост и как он попадал в Ingress?"
      },
      {
        "number": 65,
        "question": "Как был развернут Ingress Controller?"
      }
    ]
  },
  {
    "id": "K8S-117",
    "topic": "Kubernetes",
    "section": "network",
    "level": "senior",
    "question": "Какие алгоритмы балансировки применяют и где их выбирают в Kubernetes?",
    "answer": "Round robin распределяет выбор по кругу, least connections учитывает текущие соединения, weighted варианты задают относительный вес, hash помогает стабильному распределению по ключу. Kubernetes Service и L7 proxy имеют разные механизмы выбора, поэтому настройки зависят от dataplane. Keepalive, долгие соединения и NAT меняют распределение запросов; измерять надо нагрузку и latency по backend. Примеры L7/L4 proxy: NGINX, HAProxy, Envoy, Traefik; MetalLB реализует публикацию LoadBalancer Service в подходящих bare-metal сетях, а не заменяет HTTP reverse proxy.",
    "follow_up": "Почему равное число соединений не равно равной нагрузке? Чем L4 LB отличается от L7?",
    "practice": "В локальном тесте сравнить количество запросов и соединений на двух backend; проверить конфигурацию выбранного proxy.",
    "rubric": "Не обещать конкретный алгоритм для любого Service; объяснить критерии выбора.",
    "source": "https://kubernetes.io/docs/reference/networking/virtual-ips/",
    "source_prompts": [
      {
        "number": 68,
        "question": "Какие алгоритмы балансировки вы знаете?"
      },
      {
        "number": 69,
        "question": "Какие LoadBalancer'ы знаешь, с какими работаешь?"
      }
    ]
  },
  {
    "id": "K8S-118",
    "topic": "Kubernetes",
    "section": "network",
    "level": "middle",
    "question": "Как два приложения из разных контейнерных образов взаимодействуют внутри Kubernetes, с Helm и без него?",
    "answer": "Для независимо масштабируемых приложений создают отдельные Deployment и Service для принимающей стороны. Клиент обращается по DNS имени Service и нужному порту; NetworkPolicy должна разрешать соединение. В одном Pod можно использовать localhost, но тогда контейнеры имеют общий lifecycle. Helm лишь генерирует и доставляет манифесты, он не добавляет отдельный сетевой протокол.",
    "follow_up": "Как обратиться к Service в другом namespace? Что поместить в values.yaml?",
    "practice": "Развернуть два учебных приложения, выполнить HTTP-запрос из первого к DNS имени второго.",
    "rubric": "Различать image, Pod, Service, DNS и способ доставки Helm.",
    "source": "https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/",
    "source_prompts": [
      {
        "number": 70,
        "question": "У нас получились 2 image, и мы их размещаем в Kubernetes, как эти два image взаимодействуют между собой, что им нужно для этого, без и с Helm-чартами?"
      }
    ]
  },
  {
    "id": "K8S-119",
    "topic": "Kubernetes",
    "section": "resources",
    "level": "middle",
    "question": "Как requests и limits влияют на размещение и исполнение, если limit больше свободной ёмкости узла?",
    "answer": "Scheduler проверяет effective requests относительно allocatable и уже запрошенных ресурсов, а не резервирует сумму limits. Если requests помещаются и остальные условия выполнены, Pod может разместиться даже при limit выше доступной ёмкости. CPU limit вызывает throttling, memory limit при превышении может привести к OOM kill. Заниженные requests создают overcommit, завышенные ухудшают утилизацию.",
    "follow_up": "Что произойдёт при достижении CPU и memory limits? Как подобрать requests без статистики?",
    "practice": "В тестовом namespace проверить requests/limits, события scheduling и container termination reason.",
    "rubric": "Отличать планирование, фактическое потребление и enforcement; не утверждать, что CPU limit вызывает OOM.",
    "source": "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/",
    "source_prompts": [
      {
        "number": 71,
        "question": "Как ограничить ресурсы контейнеру?"
      },
      {
        "number": 72,
        "question": "Основные два типа ресурсов в манифесте?"
      },
      {
        "number": 73,
        "question": "Минусы `request` ограничения."
      },
      {
        "number": 74,
        "question": "Допустим, у нас `limit` и `request` разный, и в кластере ресурсов меньше, чем в лимите. Даст ли нам выложить pod в кластер?"
      },
      {
        "number": 75,
        "question": "Что произойдет, если приложение дойдет до лимита памяти для контейнера? Что произойдет, если дойдет до лимита CPU?"
      }
    ]
  },
  {
    "id": "K8S-120",
    "topic": "Kubernetes",
    "section": "resources",
    "level": "senior",
    "question": "Три Pod используют одинаково по 1 GiB, а на узле MemoryPressure. Как определяется порядок eviction?",
    "answer": "Одного значения usage недостаточно. Kubelet учитывает, превышает ли Pod requests по дефицитному ресурсу, затем Priority, затем потребление относительно requests при сортировке кандидатов. QoS влияет косвенно через настройки requests; eviction узла не равен рестарту контейнера после cgroup OOM. Контроллер может создать замену выселенного Pod на другом узле.",
    "follow_up": "Можно ли гарантировать порядок только по QoS? Как отличить Evicted от OOMKilled?",
    "practice": "На учебном стенде сравнить requests, priorityClassName, node conditions и Pod status.",
    "rubric": "Не угадывать порядок без requests и priority; различать eviction и OOM.",
    "source": "https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/",
    "source_prompts": [
      {
        "number": 77,
        "question": "В сети три разных приложения, каждое из них потребляет 1000 memory, и на ноде начинает расти потребление памяти. В каком порядке к ним придет Kubernetes и начнет их рестартовывать?"
      }
    ]
  },
  {
    "id": "K8S-121",
    "topic": "Kubernetes",
    "section": "autoscaling",
    "level": "senior",
    "question": "Чем HPA, VPA и Karpenter отличаются по объекту масштабирования?",
    "answer": "HPA меняет число реплик workload. VPA оценивает и может изменять requests контейнеров по поддерживаемой политике и версии. Karpenter управляет предоставлением и консолидацией узлов через поддерживаемый provider, ориентируясь на требования Pod и NodePool. NodeClaim представляет запрос на конкретную вычислительную ёмкость. Karpenter не заменяет HPA и не гарантирует устранение невозможных scheduling constraints.",
    "follow_up": "Как ограничить NodePool и риск disruption? Почему автоскейлинг не исправляет ошибочную affinity?",
    "practice": "На локальной схеме проследить Pod Pending → требования к узлу → NodeClaim; для практики не подключать платный cloud.",
    "rubric": "Различить replicas, requests и nodes; назвать provider-specific ограничения.",
    "source": "https://karpenter.sh/docs/concepts/nodeclaims/",
    "source_prompts": [
      {
        "number": 79,
        "question": "HPA и VPA."
      },
      {
        "number": 80,
        "question": "Использовался ли автоскейлинг, HPA/VPA?"
      },
      {
        "number": 86,
        "question": "Что такое Karpenter?"
      }
    ]
  },
  {
    "id": "K8S-122",
    "topic": "Kubernetes",
    "section": "design",
    "level": "lead",
    "question": "Как определить размер узлов и начальную ёмкость кластера без статистики приложения?",
    "answer": "Точный размер без измерений неизвестен. Начни с требований SLO и минимальной топологии, измерь CPU, память, I/O и throughput одной реплики на контролируемой нагрузке, оцени requests и число реплик. Вычти system reserve, DaemonSet и Pod overhead из ёмкости; заложи запас на отказ зоны/узла и rollout. Проверь load test, хвост latency и стоимость, затем пересматривай модель. Scalability — способность выдерживать рост нагрузки при добавлении ресурсов; HA — способность сохранять доступность при отказах. Они связаны, но не эквивалентны.",
    "follow_up": "Чем scalability отличается от HA? Почему scale up не всегда лучше scale out?",
    "practice": "Составить capacity sheet на основе измеренного throughput, p99 и requests; сравнить два типа узлов.",
    "rubric": "Не придумывать точные ресурсы без данных, различать масштабирование и доступность.",
    "source": "https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/",
    "source_prompts": [
      {
        "number": 82,
        "question": "Что такое scaleability и high-availability?"
      },
      {
        "number": 83,
        "question": "Как определить размер одной ноды?"
      },
      {
        "number": 84,
        "question": "Как определить ресурс, который необходим одной ноде, не зная характеристик кластера?"
      },
      {
        "number": 85,
        "question": "Как первоначально оценить, не зная как приложение работает, нагрузкой размер ноды в Kubernetes (по памяти, по процессам и ресурсам)?"
      }
    ]
  },
  {
    "id": "K8S-123",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "senior",
    "question": "Опиши полный путь создания Pod от kubectl apply до готовности приложения.",
    "answer": "API server выполняет authentication, authorization, admission и сохраняет объект. Контроллеры создают дочерние объекты для workload, scheduler привязывает обычный незапланированный Pod к узлу. Kubelet обнаруживает назначение, организует volumes, sandbox, сеть через runtime/CNI и запуск контейнеров. После инициализации и успешной readiness Pod становится подходящим backend при совпадении selector.",
    "follow_up": "На каком этапе появляются FailedScheduling, FailedMount и ImagePullBackOff? Чем Running отличается от Ready?",
    "practice": "На учебном Deployment проследить events, ownerReferences, nodeName, containerStatuses и EndpointSlice.",
    "rubric": "Объяснить последовательность API→контроллер→scheduler→kubelet→readiness без обещания строго синхронных операций.",
    "source": "https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/",
    "source_prompts": [
      {
        "number": 87,
        "question": "Как создается под, весь процесс?"
      }
    ]
  },
  {
    "id": "K8S-124",
    "topic": "Kubernetes",
    "section": "scheduling",
    "level": "middle",
    "question": "Как обеспечить размещение двух реплик приложения на разных узлах?",
    "answer": "Использовать requiredDuringSchedulingIgnoredDuringExecution podAntiAffinity с selector своих реплик и topologyKey kubernetes.io/hostname. Альтернатива — подходящие topologySpreadConstraints, если требования допускают их семантику. При одном подходящем узле вторая реплика останется Pending; предпочтительная anti-affinity не гарантирует разнесение.",
    "follow_up": "Чем nodeAffinity отличается от podAntiAffinity? Что выбрать при дефиците capacity?",
    "practice": "На учебном кластере с двумя worker сравнить размещение и FailedScheduling при одном worker.",
    "rubric": "Назвать topologyKey, hard/soft constraint и компромисс доступности.",
    "source": "https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/",
    "source_prompts": [
      {
        "number": 91,
        "question": "Тебе нужно поднять контейнер в двух репликах, только чтобы они не встретились в одной и той же ноде (узле)."
      },
      {
        "number": 92,
        "question": "Что такое affinity и anti-affinity?"
      }
    ]
  },
  {
    "id": "K8S-125",
    "topic": "Kubernetes",
    "section": "workloads",
    "level": "middle",
    "question": "Какие три вида probes существуют и что происходит при их отказе?",
    "answer": "Startup probe проверяет успешную инициализацию, до её успеха liveness и readiness не запускаются. Неудачная readiness делает Pod неподходящим для обычного Service-трафика, но сама не перезапускает контейнер. Исчерпание порога liveness или startup приводит к завершению контейнера с последующим действием restart policy. HTTP, TCP, exec и gRPC проверки имеют разные условия успеха.",
    "follow_up": "Почему liveness не должна зависеть от доступности общей БД? Как выбрать пороги?",
    "practice": "На тестовом Pod изменить readiness endpoint и отдельно вызвать liveness failure, сравнить restartCount и EndpointSlice.",
    "rubric": "Различать последствия всех трёх probes, не смешивать рестарт и исключение трафика.",
    "source": "https://kubernetes.io/docs/concepts/configuration/liveness-readiness-startup-probes/",
    "source_prompts": [
      {
        "number": 93,
        "question": "Какие типы проб ты знаешь?"
      },
      {
        "number": 94,
        "question": "Как работают пробы в Kubernetes?"
      },
      {
        "number": 95,
        "question": "Что произойдет, если под не пройдет одну из этих проб?"
      }
    ]
  },
  {
    "id": "K8S-126",
    "topic": "Kubernetes",
    "section": "operations",
    "level": "middle",
    "question": "Что такое system Pods и что проверять при их отказе?",
    "answer": "System Pods — разговорное обозначение инфраструктурных workload, часто в kube-system: DNS, сетевые агенты, контроллеры storage и компоненты control plane в некоторых дистрибутивах. Не все компоненты обязаны быть Pod, а namespace не определяет их поведение автоматически. Важно знать owner, размещение, health и влияние отказа на API, DNS, networking или storage.",
    "follow_up": "Почему нельзя бездумно удалить все Pod kube-system? Как определить компонент, управляющий Pod?",
    "practice": "kubectl get pods -n kube-system -o wide; проверить ownerReferences, events и логи конкретного компонента.",
    "rubric": "Объяснить назначение, различать системные workload и пользовательские приложения.",
    "source": "https://kubernetes.io/docs/concepts/architecture/",
    "source_prompts": [
      {
        "number": 99,
        "question": "Что такое system pods?"
      }
    ]
  },
  {
    "id": "K8S-127",
    "topic": "Kubernetes",
    "section": "helm",
    "level": "middle",
    "question": "Что такое Helm, Chart и Release и зачем они нужны?",
    "answer": "Helm управляет пакетами Kubernetes. Chart содержит метаданные, values, шаблоны и при необходимости зависимости; при установке шаблоны превращаются в Kubernetes manifests. Release — экземпляр установки chart с именем, namespace, values и историей revisions. Helm облегчает повторяемую доставку, но не гарантирует корректность YAML или здоровье приложения.",
    "follow_up": "Чем helm template отличается от helm install? Почему values для dev и prod должны быть управляемыми?",
    "practice": "На локальном chart выполнить helm lint и helm template demo ./chart -f values.yaml.",
    "rubric": "Различать package, rendered manifests и установленный release.",
    "source": "https://helm.sh/docs/intro/using_helm/",
    "source_prompts": [
      {
        "number": 100,
        "question": "Что такое Helm? Для чего он нужен?"
      },
      {
        "number": 101,
        "question": "Что такое Helm Chart? Для чего?"
      },
      {
        "number": 102,
        "question": "Что дает нам Helm в Kuber, в чем его неоспоримый плюс?"
      },
      {
        "number": 103,
        "question": "Писал ли хелмчарты?"
      }
    ]
  },
  {
    "id": "K8S-128",
    "topic": "Kubernetes",
    "section": "helm",
    "level": "senior",
    "question": "Где Helm хранит данные о релизе и какие риски это создаёт?",
    "answer": "В Helm 3 по умолчанию записи релизов хранятся в Kubernetes Secrets соответствующего namespace; возможны другие storage drivers. История содержит values и rendered manifests, поэтому чувствительные данные могут попасть в release metadata. Ограничивай RBAC, не передавай plaintext secrets в values, защищай резервные копии и не удаляй историю без плана.",
    "follow_up": "Чем helm history отличается от истории Deployment? Как проверить backend установленной версии Helm?",
    "practice": "helm history demo -n demo; helm list -n demo; проверить только metadata release Secrets.",
    "rubric": "Назвать default backend с оговоркой версии, риск секретов и отличия историй.",
    "source": "https://helm.sh/docs/intro/using_helm/",
    "source_prompts": [
      {
        "number": 104,
        "question": "Где Helm хранит данные о релизе?"
      }
    ]
  },
  {
    "id": "K8S-129",
    "topic": "Kubernetes",
    "section": "helm",
    "level": "senior",
    "question": "Как откатить неработающий Helm release и проверить, что откат действительно успешен?",
    "answer": "Определить release и namespace, исследовать helm status, helm history, Kubernetes events и причины отказа. Выбрать известную рабочую revision и выполнить helm rollback RELEASE REVISION с подходящими wait/timeout для установленной версии. Проверить rollout, readiness, пользовательские SLI и состояние данных. Helm rollback не отменяет внешние миграции и эффекты hooks.",
    "follow_up": "Что делать при несовместимой БД? Как избежать повторного использования изменяемого image tag?",
    "practice": "На учебном release вызвать ошибку обновления и откатить к предыдущей revision; проверить HTTP и историю.",
    "rubric": "Отличать возврат manifest от восстановления данных, требовать проверку сервиса.",
    "source": "https://helm.sh/docs/helm/helm_rollback/",
    "source_prompts": [
      {
        "number": 105,
        "question": "У нас закатился Helm-релиз, и сами поды не работают, и нам нужно откатить на версию раньше. Как бы ты сделал?"
      }
    ]
  },
  {
    "id": "K8S-130",
    "topic": "Kubernetes",
    "section": "helm",
    "level": "senior",
    "question": "Как убрать Ingress из Helm release без случайного удаления других ресурсов?",
    "answer": "Изменить chart или values так, чтобы ненужный Ingress не рендерился, проверить diff предыдущего и нового набора манифестов. Обычный upgrade удаляет ранее управляемый ресурс, отсутствующий в новой конфигурации, с учётом особенностей lifecycle, hooks и resource-policy. Предварительно обеспечить новый маршрут и проверить DNS/TLS. Не удалять вручную объект, пока Git/Chart остаётся источником истины.",
    "follow_up": "Как проверить ownership? Почему аннотация helm.sh/resource-policy: keep меняет ожидания?",
    "practice": "В выделенном namespace отрендерить обе версии, проверить diff и upgrade, убедиться, что альтернативный маршрут работает.",
    "rubric": "Объяснить изменение desired state, влияние на трафик и правила удаления.",
    "source": "https://helm.sh/docs/intro/using_helm/",
    "source_prompts": [
      {
        "number": 106,
        "question": "Если мне нужно убрать что-то из деплоймента, и все запускалось через Helm, но мы отказались от Ingress. Твои действия, как ты будешь делать обновление?"
      }
    ]
  },
  {
    "id": "K8S-131",
    "topic": "Kubernetes",
    "section": "helm",
    "level": "senior",
    "question": "Как автоматизировать Helm-деплой через CI/CD и зачем нужен Helmfile?",
    "answer": "CI проверяет chart через lint, template, schema/policy проверки и тесты; фиксирует версии chart и digest образов. CD выполняет контролируемый upgrade/install с отдельными credentials, ограничением параллелизма, wait/timeout и проверкой SLI. Helmfile декларативно описывает набор releases, окружения, values и зависимости, но не является постоянно работающим reconciler как GitOps controller. Проверяй flags по версии Helm.",
    "follow_up": "Как избежать утечки Secret в dry-run? Когда нужен ручной approval?",
    "practice": "На локальном стенде подготовить helmfile template/diff и безопасный pipeline без production credentials.",
    "rubric": "Различать Helm, Helmfile, CI/CD и GitOps; предусмотреть безопасность и rollback.",
    "source": "https://helmfile.readthedocs.io/en/stable/",
    "source_prompts": [
      {
        "number": 107,
        "question": "Как автоматически деплоить Helm?"
      },
      {
        "number": 108,
        "question": "Что такое Helmfile? Для чего?"
      }
    ]
  },
  {
    "id": "K8S-132",
    "topic": "Kubernetes",
    "section": "delivery",
    "level": "middle",
    "question": "Какие стратегии развёртывания Kubernetes поддерживает и что происходит при смене image в Deployment?",
    "answer": "Deployment поддерживает RollingUpdate и Recreate. Изменение image в spec.template приводит к новому Pod template и ReplicaSet, который масштабируется согласно стратегии; старый ReplicaSet уменьшается. Blue-green и canary требуют дополнительных workload и управления трафиком. Изменение тега в registry без изменения шаблона не инициирует новый rollout.",
    "follow_up": "Почему kubectl set image может конфликтовать с GitOps? Чем Recreate рискует для доступности?",
    "practice": "На учебном Deployment изменить image на контролируемую версию, проверить ReplicaSet и rollout history.",
    "rubric": "Назвать триггер Pod template и различать встроенные стратегии от схем доставки.",
    "source": "https://kubernetes.io/docs/concepts/workloads/controllers/deployment/",
    "source_prompts": [
      {
        "number": 109,
        "question": "Какие стратегии развертывания вы знаете?"
      },
      {
        "number": 110,
        "question": "Стратегии деплоя в Kubernetes."
      },
      {
        "number": 111,
        "question": "Что произойдет при изменении image? Как будут докатываться изменения?"
      },
      {
        "number": 112,
        "question": "Когда ты обновляешь image внутри Deployment, либо через kubectl, либо через свой деплоймент, когда ты меняешь image, что происходит? Можешь описать?"
      }
    ]
  },
  {
    "id": "K8S-133",
    "topic": "Kubernetes",
    "section": "delivery",
    "level": "senior",
    "question": "Какие манифесты нужны для запуска микросервиса с kubectl и с Helm?",
    "answer": "Обычно задают Deployment с image digest, resources и probes, Service для стабильного доступа, ConfigMap/Secret references, ServiceAccount и NetworkPolicy. При необходимости добавляют Ingress/Gateway, HPA, PDB и PVC. Через kubectl применяют проверенные manifests; Helm упаковывает те же ресурсы как chart с values. Проверки готовности и доступности обязательны в обоих случаях.",
    "follow_up": "Как избежать изменения чужого namespace? Что проверить до и после deploy?",
    "practice": "В учебном context применить manifest или helm upgrade --install, затем проверить rollout status и запрос к сервису.",
    "rubric": "Не считать Helm обязательным для Kubernetes, указать конфигурацию, identity, сеть и проверку.",
    "source": "https://kubernetes.io/docs/concepts/workloads/management/",
    "source_prompts": [
      {
        "number": 40,
        "question": "Писал ли манифесты?"
      },
      {
        "number": 114,
        "question": "Как ты запустишь какое-нибудь приложение в кубере, с Helm и без Helm, только `kubectl`?"
      },
      {
        "number": 115,
        "question": "Что вообще опишешь при создании приложения?"
      }
    ]
  },
  {
    "id": "K8S-134",
    "topic": "Kubernetes",
    "section": "storage",
    "level": "lead",
    "question": "Как развернуть PostgreSQL в Kubernetes и чем production отличается от учебного StatefulSet?",
    "answer": "Для учебного экземпляра нужны StatefulSet или иной подходящий workload, PVC, Service, Secret references и корректные probes. Production требует осознанного выбора оператора или внешней БД, репликации, leader-aware routing, fencing, backup и WAL/PITR, контролируемого обновления и независимых failure domains. Несколько реплик StatefulSet сами по себе не создают PostgreSQL replication.",
    "follow_up": "Как доказать RPO/RTO? Что будет при потере узла с local PV?",
    "practice": "На локальной тестовой БД выполнить restore контрольных данных и измерить время; не подключать рабочую БД.",
    "rubric": "Различать запуск процесса и эксплуатацию stateful HA, учитывать данные и восстановление.",
    "source": "https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/",
    "source_prompts": [
      {
        "number": 116,
        "question": "Как развернуть PostgreSQL в Kubernetes?"
      }
    ]
  },
  {
    "id": "K8S-135",
    "topic": "Kubernetes",
    "section": "delivery",
    "level": "senior",
    "question": "Где хранятся container images и как оптимизировать их для Kubernetes?",
    "answer": "Образы публикуются в registry и кешируются runtime на узлах. Kubernetes хранит ссылку на образ, а не его слои в etcd. Multi-stage build, минимальная подходящая base image, исключение build dependencies, правильный .dockerignore и стабильные layers уменьшают размер и время доставки. Фиксируй digest, проверяй архитектуру, non-root и supply chain; минимальный размер не заменяет безопасность.",
    "follow_up": "Почему удаление пакета в следующем Docker layer не всегда уменьшает итоговый образ? Как проверить imageID?",
    "practice": "Сравнить размер и состав двух локально собранных образов, проверить запуск и health.",
    "rubric": "Объяснить registry/runtime cache, воспроизводимость и реальные измерения.",
    "source": "https://kubernetes.io/docs/concepts/containers/images/",
    "source_prompts": [
      {
        "number": 118,
        "question": "Хранение образов в Kubernetes."
      },
      {
        "number": 119,
        "question": "Какие приемы знаешь, чтобы оптимизировать Image?"
      }
    ]
  },
  {
    "id": "K8S-136",
    "topic": "Kubernetes",
    "section": "troubleshooting",
    "level": "senior",
    "question": "Разработчик сообщает, что приложение недоступно. Как построить базовый troubleshooting от симптома к причине?",
    "answer": "Уточнить масштаб, время начала, URL и код ошибки, проверить пользовательский SLI и последние изменения. Затем проверить внешний endpoint, Service/EndpointSlice, Pod readiness, events, logs и зависимости. Сравнить прямой запрос к backend с запросом через Service/Ingress; при необходимости проверить DNS, policy и capacity. Сначала ограничить impact обратимым действием, затем подтвердить recovery и RCA.",
    "follow_up": "Как отличить 503 ingress от ошибки приложения? Что делать, если проблема только у одного клиента?",
    "practice": "На отдельном стенде испортить selector или readiness и собрать доказательства до исправления.",
    "rubric": "Показать последовательное исключение гипотез, безопасную mitigation и критерий восстановления.",
    "source": "https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/",
    "source_prompts": [
      {
        "number": 120,
        "question": "Базовый траблшутинг в Kubernetes."
      },
      {
        "number": 121,
        "question": "К вам подходит разраб и спрашивает, что его приложение недоступно. Что будешь делать?"
      }
    ]
  },
  {
    "id": "K8S-137",
    "topic": "Kubernetes",
    "section": "operations",
    "level": "senior",
    "question": "Как организовать observability Kubernetes и какие сигналы нужны для диагностики?",
    "answer": "Нужны метрики workload и узлов, события и логи компонентов, распределённые traces для прикладных цепочек. Metrics Server предоставляет resource metrics для autoscaling и kubectl top, но не заменяет долговременный мониторинг. Отдельно измеряй availability/latency/error rate, saturation, API/etcd, очередь scheduler и состояние controllers; настраивай actionable alerts и retention.",
    "follow_up": "Почему kube-state-metrics и metrics-server решают разные задачи? Как связать trace с Pod и версией релиза?",
    "practice": "На локальной инфраструктуре сравнить kubectl top, events и метрики приложения; составить SLO alert.",
    "rubric": "Различать resource metrics, состояние API объектов и прикладные SLI; не считать наличие Grafana готовым мониторингом.",
    "source": "https://kubernetes.io/docs/tasks/debug/debug-cluster/resource-usage-monitoring/",
    "source_prompts": [
      {
        "number": 122,
        "question": "Observability."
      }
    ]
  },
  {
    "id": "K8S-138",
    "topic": "Kubernetes",
    "section": "security",
    "level": "middle",
    "question": "Что такое ServiceAccount и как организовать безопасный доступ к Kubernetes API?",
    "answer": "ServiceAccount представляет identity workload в namespace. Права на API выдаются через RBAC, а authentication подтверждает identity; современные Pod обычно получают ограниченный по времени projected token при включённом automount. Для людей используют отдельный механизм authentication, например OIDC, и персональные права. Не использовать общий admin kubeconfig или один token для всех приложений.",
    "follow_up": "Как проверить доступ через kubectl auth can-i? Чем Role отличается от ServiceAccount?",
    "practice": "Создать учебный ServiceAccount с read-only RoleBinding и проверить разрешённые и запрещённые операции.",
    "rubric": "Различать authentication, authorization, identity человека и workload.",
    "source": "https://kubernetes.io/docs/concepts/security/service-accounts/",
    "source_prompts": [
      {
        "number": 125,
        "question": "Каким сервисом пользуешься для настройки безопасности и доступа к кластеру?"
      },
      {
        "number": 126,
        "question": "Что такое ServiceAccount в кубере, для чего?"
      }
    ]
  },
  {
    "id": "LNX-001",
    "topic": "Linux",
    "section": "kernel",
    "level": "middle",
    "question": "Чем userspace отличается от kernel space и зачем нужны системные вызовы?",
    "answer": "Приложения исполняются с ограниченными привилегиями, ядро управляет памятью, устройствами, планированием и доступом к ресурсам. Системный вызов позволяет программе запросить услугу ядра через контролируемый интерфейс. Библиотечная функция не обязательно вызывает ядро: некоторые операции выполняются полностью в userspace.",
    "follow_up": "Чем syscall отличается от обычного вызова функции? Почему segfault не обязательно означает ошибку ядра?",
    "practice": "strace -e trace=openat,read,write /bin/cat /etc/hostname; сравнить системные вызовы и вывод.",
    "rubric": "Назвать границу привилегий и роль ядра, не путать библиотеку с syscall.",
    "source": "https://man7.org/linux/man-pages/man2/syscalls.2.html"
  },
  {
    "id": "LNX-002",
    "topic": "Linux",
    "section": "kernel",
    "level": "senior",
    "question": "Как Linux загружает систему от bootloader до пользовательских сервисов?",
    "answer": "Прошивка запускает загрузчик или другой предусмотренный механизм загрузки ядра. Ядро инициализирует устройства, использует initramfs при необходимости, монтирует корневую файловую систему и запускает init как PID 1. В systemd-системе PID 1 активирует units по зависимостям и выбранной цели. Отказ локализуют по стадии загрузки, а не только по сообщениям сервисов.",
    "follow_up": "Зачем initramfs при LVM или зашифрованном root? Чем emergency.target отличается от обычной загрузки?",
    "practice": "На тестовой VM: journalctl -b -k; systemd-analyze critical-chain; cat /proc/cmdline.",
    "rubric": "Разделить bootloader, ядро, initramfs, root FS и PID 1; учитывать дистрибутив.",
    "source": "https://www.freedesktop.org/software/systemd/man/latest/bootup.html"
  },
  {
    "id": "LNX-003",
    "topic": "Linux",
    "section": "process",
    "level": "middle",
    "question": "Что происходит при fork и execve и почему это две разные операции?",
    "answer": "fork создаёт дочерний процесс с отдельным PID и первоначально сходным адресным пространством; Linux обычно использует copy-on-write. execve заменяет программу в существующем процессе, не создавая новый PID. Некоторые дескрипторы остаются открытыми, если не помечены close-on-exec. Shell обычно сочетает создание процесса и exec для запуска внешней команды.",
    "follow_up": "Почему fork не обязательно сразу копирует всю память? Что означает FD_CLOEXEC?",
    "practice": "strace -f -e trace=process bash -c 'echo test; /bin/true'; посмотреть создание и exec.",
    "rubric": "Различать создание процесса и замену программы, объяснить COW и дескрипторы.",
    "source": "https://man7.org/linux/man-pages/man2/execve.2.html"
  },
  {
    "id": "LNX-004",
    "topic": "Linux",
    "section": "process",
    "level": "middle",
    "question": "Чем процесс отличается от потока в Linux?",
    "answer": "Потоки одного процесса обычно разделяют адресное пространство, файловые дескрипторы и другие ресурсы, но имеют собственные стек, регистры и идентификатор потока. Linux планирует исполняемые задачи, поэтому многопоточный процесс может использовать несколько CPU. Изоляция процессов сильнее, однако IPC и общая память позволяют обмен данными.",
    "follow_up": "Как найти поток с высокой загрузкой CPU? Почему один процесс может показывать больше 100% CPU?",
    "practice": "ps -L -p PID -o pid,tid,stat,pcpu,comm; top -H -p PID.",
    "rubric": "Объяснить shared memory, TID и параллельное исполнение; не считать PID и TID всегда равными.",
    "source": "https://man7.org/linux/man-pages/man7/pthreads.7.html"
  },
  {
    "id": "LNX-005",
    "topic": "Linux",
    "section": "process",
    "level": "senior",
    "question": "Что означают состояния R, S, D, T и Z и как они влияют на диагностику?",
    "answer": "R означает running/runnable, S — interruptible sleep, D — uninterruptible sleep (часто ожидание I/O), T — остановленную задачу, Z — завершившийся процесс, чей статус ещё не забрал родитель. Длительное D требует анализа ожидания ядра или устройства; SIGKILL не гарантирует немедленное исчезновение задачи. Z не выполняет пользовательский код.",
    "follow_up": "Как различить D и Z? Что смотреть в wchan?",
    "practice": "ps -eo pid,ppid,stat,wchan:32,comm; исследовать только разрешённые процессы.",
    "rubric": "Различать ожидание, остановку и zombie; не предлагать kill -9 как универсальное лечение.",
    "source": "https://man7.org/linux/man-pages/man5/proc_pid_stat.5.html"
  },
  {
    "id": "LNX-006",
    "topic": "Linux",
    "section": "process",
    "level": "senior",
    "question": "Почему zombie-процесс нельзя устранить обычным kill и чем опасна их массовость?",
    "answer": "Zombie уже завершил выполнение, но ядро сохраняет минимальные данные, чтобы родитель забрал статус через wait. Сигнал самому zombie не решает проблему. Найти родителя, проверить обработку SIGCHLD и wait; исправлять или контролируемо перезапускать родителя после оценки impact. Большое число zombie способно исчерпать доступные PID/лимиты задач.",
    "follow_up": "Что происходит при завершении родителя? Что такое subreaper?",
    "practice": "ps -eo pid,ppid,stat,comm; найти Z и сопоставить PPID.",
    "rubric": "Объяснить reaping и ограничение ресурсов, не убивать произвольные процессы.",
    "source": "https://man7.org/linux/man-pages/man2/wait.2.html"
  },
  {
    "id": "LNX-007",
    "topic": "Linux",
    "section": "process",
    "level": "middle",
    "question": "Чем SIGTERM, SIGKILL, SIGHUP и SIGSTOP отличаются?",
    "answer": "SIGTERM просит завершение и может быть обработан приложением. SIGKILL невозможно перехватить или игнорировать, он не даёт приложению выполнить штатную очистку. SIGHUP исторически связан с терминалом, а некоторые daemon используют его для reload; смысл зависит от приложения. SIGSTOP останавливает выполнение и также не перехватывается.",
    "follow_up": "Почему reload по HUP нужно подтверждать документацией? Чем SIGSTOP отличается от SIGTSTP?",
    "practice": "На тестовом sleep проверить TERM и STOP/CONT, не использовать команды на рабочих PID.",
    "rubric": "Назвать семантику сигналов и безопасную эскалацию остановки.",
    "source": "https://man7.org/linux/man-pages/man7/signal.7.html"
  },
  {
    "id": "LNX-008",
    "topic": "Linux",
    "section": "process",
    "level": "senior",
    "question": "Как определить, что процесс исчерпал файловые дескрипторы, и не спутать EMFILE с ENFILE?",
    "answer": "EMFILE означает достижение лимита открытых дескрипторов процесса, ENFILE — ограничение системной таблицы открытых файлов. Проверить /proc/PID/limits, число и тип FD в /proc/PID/fd, системные file-nr/file-max. Выяснить, растут ли сокеты или файлы из-за утечки; увеличение лимита без устранения причины лишь отсрочит отказ.",
    "follow_up": "Как связаны ulimit -n и LimitNOFILE в systemd? Почему fd count не равен числу клиентов?",
    "practice": "cat /proc/PID/limits; ls /proc/PID/fd | wc -l; cat /proc/sys/fs/file-nr.",
    "rubric": "Различать процессный и глобальный лимиты; искать тип утечки и контролировать последствия.",
    "source": "https://man7.org/linux/man-pages/man2/open.2.html"
  },
  {
    "id": "LNX-009",
    "topic": "Linux",
    "section": "process",
    "level": "senior",
    "question": "Почему многопоточное приложение тормозит при низкой загрузке CPU из-за блокировок?",
    "answer": "Потоки могут ожидать mutex, condition variable или I/O вместо выполнения инструкций. CPU utilization отражает время работы, а не время ожидания. Изучи thread states, системные вызовы futex, задержки и профили off-CPU; затем сопоставь их с приложением. Один futex в strace не доказывает дедлок.",
    "follow_up": "Как отличить contention от deadlock? Когда нужен thread dump?",
    "practice": "ps -L -p PID -o tid,stat,wchan:32; на тестовом приложении ограниченный strace -f -tt -T.",
    "rubric": "Не путать ожидание с CPU bottleneck; требовать доказательства причины и оценить overhead.",
    "source": "https://man7.org/linux/man-pages/man2/futex.2.html"
  },
  {
    "id": "LNX-010",
    "topic": "Linux",
    "section": "process",
    "level": "senior",
    "question": "Что такое process group и session и почему остановка shell не всегда останавливает все дочерние процессы?",
    "answer": "Process group объединяет задачи для job control и доставки сигналов, session объединяет группы и может иметь управляющий терминал. Потомок может создать новую session или группу и пережить завершение оболочки. Для управляемых сервисов systemd использует cgroup и правила KillMode, что надёжнее простого убийства родительского PID.",
    "follow_up": "Как setsid и nohup влияют на связь с терминалом? Почему nohup не является supervisor?",
    "practice": "ps -eo pid,ppid,pgid,sid,stat,comm; сравнить тестовую команду в новой session.",
    "rubric": "Различать родительство, группу, session и cgroup; объяснить управление всем сервисом.",
    "source": "https://man7.org/linux/man-pages/man7/credentials.7.html"
  },
  {
    "id": "LNX-011",
    "topic": "Linux",
    "section": "memory",
    "level": "middle",
    "question": "Почему free показывает мало free memory, но система работает нормально?",
    "answer": "Linux использует свободную RAM для page cache и других кешей. MemAvailable оценивает объём памяти, доступный новым приложениям без существенного swapping, с учётом reclaimable страниц и резервов. Малое MemFree само по себе не означает дефицит. Важно наблюдать available, reclaim, swap I/O и latency.",
    "follow_up": "Чем buff/cache отличается от anonymous memory? Почему drop_caches не плановая оптимизация?",
    "practice": "free -h; grep -E 'MemAvailable|Cached|SReclaimable|AnonPages' /proc/meminfo.",
    "rubric": "Объяснить reclaimable cache и не рекомендовать очищать кеш без причины.",
    "source": "https://man7.org/linux/man-pages/man5/proc_meminfo.5.html"
  },
  {
    "id": "LNX-012",
    "topic": "Linux",
    "section": "memory",
    "level": "senior",
    "question": "Чем VSZ, RSS и PSS отличаются при оценке памяти процесса?",
    "answer": "VSZ отражает размер виртуального адресного пространства и включает зарезервированные отображения. RSS учитывает резидентные страницы, в том числе общие; сумма RSS процессов может дважды учитывать одни страницы. PSS распределяет стоимость общих страниц между отображающими их процессами. Для утечки анализируй динамику anonymous/private memory и особенности аллокатора.",
    "follow_up": "Почему большой VSZ не означает потребление RAM? Что даёт smaps_rollup?",
    "practice": "ps -p PID -o vsz,rss; cat /proc/PID/smaps_rollup при наличии прав и поддержки.",
    "rubric": "Различать виртуальную, резидентную и пропорциональную память.",
    "source": "https://man7.org/linux/man-pages/man5/proc_pid_smaps.5.html"
  },
  {
    "id": "LNX-013",
    "topic": "Linux",
    "section": "memory",
    "level": "senior",
    "question": "Почему выделение памяти malloc может завершиться успешно, а запись в неё позже привести к OOM?",
    "answer": "Виртуальный адресный диапазон может быть выделен до фактического выделения физических страниц; Linux также применяет политику overcommit. При обращении к страницам ядро выделяет RAM и при необходимости reclaim/swap. Когда удовлетворить запрос не удаётся, возможен OOM. Не все malloc гарантированно успешны: ограничения и политика overcommit могут вызвать ENOMEM раньше.",
    "follow_up": "Как vm.overcommit_memory влияет на поведение? Что означает CommitLimit?",
    "practice": "На VM читать /proc/meminfo и sysctl vm.overcommit_memory; использовать ограниченный тест без исчерпания памяти хоста.",
    "rubric": "Разделить виртуальное выделение, page fault и фактическую ёмкость.",
    "source": "https://docs.kernel.org/mm/overcommit-accounting.html"
  },
  {
    "id": "LNX-014",
    "topic": "Linux",
    "section": "memory",
    "level": "senior",
    "question": "Чем minor page fault отличается от major page fault?",
    "answer": "Minor fault обслуживается без чтения данных страницы с backing storage, например при настройке отображения уже доступной страницы. Major fault требует I/O для получения страницы и способен увеличить задержку. Page fault не обязательно означает ошибку; page fault является нормальной частью demand paging и copy-on-write.",
    "follow_up": "Почему рост major faults может сопровождать деградацию БД? Как отличить его от segfault?",
    "practice": "pidstat -r 1; perf stat -e page-faults,major-faults -- /bin/true в тестовой среде.",
    "rubric": "Различать demand paging и ошибочный доступ, коррелировать faults с latency.",
    "source": "https://man7.org/linux/man-pages/man2/getrusage.2.html"
  },
  {
    "id": "LNX-015",
    "topic": "Linux",
    "section": "memory",
    "level": "senior",
    "question": "Как отличить cgroup OOM от глобального OOM на Linux-сервере?",
    "answer": "При cgroup OOM ограничение memory.max может исчерпаться, даже если у хоста ещё есть RAM. Глобальный OOM связан с невозможностью ядра удовлетворить запрос в соответствующем контексте системы. Проверяй kernel journal, cgroup v2 memory.events и memory.current/max, статус завершения. Exit 137 означает SIGKILL по распространённой shell convention, но не доказывает OOM.",
    "follow_up": "Что означают oom и oom_kill в memory.events? Почему free на хосте недостаточно?",
    "practice": "journalctl -k; cat /proc/PID/cgroup; прочитать memory.events и memory.max нужной cgroup.",
    "rubric": "Требовать независимые доказательства OOM, различать scope и exit code.",
    "source": "https://docs.kernel.org/admin-guide/cgroup-v2.html"
  },
  {
    "id": "LNX-016",
    "topic": "Linux",
    "section": "memory",
    "level": "senior",
    "question": "Как понять, что swap используется нормально, а не вызывает thrashing?",
    "answer": "Ненулевой swap usage может содержать давно вытесненные холодные страницы и не означать текущую проблему. Thrashing проявляется интенсивным page-in/page-out, reclaim, stalls и деградацией latency. Сравни vmstat si/so, major faults, memory PSI и I/O latency с baseline. Решение зависит от профиля приложения и доступной ёмкости.",
    "follow_up": "Почему swapoff на перегруженном сервере опасен? Что означает swappiness?",
    "practice": "vmstat 1; cat /proc/pressure/memory; swapon --show; проверить latency сервиса.",
    "rubric": "Отличать объём swap от скорости обмена и не отключать его вслепую.",
    "source": "https://docs.kernel.org/admin-guide/sysctl/vm.html"
  },
  {
    "id": "LNX-017",
    "topic": "Linux",
    "section": "memory",
    "level": "lead",
    "question": "Как NUMA влияет на производительность приложения на многосокетном сервере?",
    "answer": "NUMA означает, что доступ CPU к памяти разных узлов имеет разную стоимость. Потоки, работающие с удалённой памятью, могут испытывать повышенную latency и ограничение bandwidth. Политика размещения памяти, first touch, CPU affinity и миграция задач влияют на результат. Настраивать pinning нужно по профилю нагрузки и измерениям, а не просто закреплять все потоки.",
    "follow_up": "Как различить NUMA bottleneck и нехватку памяти? Почему CPU pinning способен ухудшить ситуацию?",
    "practice": "На подходящей VM/сервере numactl --hardware; numastat -p PID; сравнить результаты нагрузочных тестов.",
    "rubric": "Объяснить locality, проверить реальную топологию и компромиссы.",
    "source": "https://docs.kernel.org/admin-guide/mm/numa_memory_policy.html"
  },
  {
    "id": "LNX-018",
    "topic": "Linux",
    "section": "cpu",
    "level": "senior",
    "question": "Что показывают user, system, iowait, steal и idle в CPU-статистике?",
    "answer": "User — выполнение пользовательского кода, system — работа ядра, idle — простаивание, iowait — учёт времени ожидания I/O с оговорками реализации и многопроцессорности, steal — время, когда виртуальный CPU не получил физический CPU от гипервизора. Эти агрегаты не являются измерением задержки конкретного запроса; важно смотреть потоки и динамику.",
    "follow_up": "Почему высокий steal требует анализа гипервизора? Почему iowait не равен utilization диска?",
    "practice": "mpstat -P ALL 1; vmstat 1; сопоставить с iostat и latency.",
    "rubric": "Корректно интерпретировать поля, не сводить проблему к одному проценту.",
    "source": "https://man7.org/linux/man-pages/man5/proc_stat.5.html"
  },
  {
    "id": "LNX-019",
    "topic": "Linux",
    "section": "cpu",
    "level": "senior",
    "question": "Почему CPU utilization 50% на 16-ядерном сервере может скрывать насыщение одного потока?",
    "answer": "Агрегатная загрузка усредняет CPU и интервалы. Однопоточный участок или affinity могут полностью занять одно ядро, пока другие простаивают. Проверяй per-CPU и per-thread usage, run queue, affinity и cgroup limits. Масштабирование числом ядер не помогает последовательному участку без изменения архитектуры.",
    "follow_up": "Как различить ограничение одним ядром и CPU quota? Что показывает taskset?",
    "practice": "mpstat -P ALL 1; top -H -p PID; taskset -pc PID.",
    "rubric": "Различать среднюю загрузку, parallelism, affinity и throttling.",
    "source": "https://man7.org/linux/man-pages/man2/sched_setaffinity.2.html"
  },
  {
    "id": "LNX-020",
    "topic": "Linux",
    "section": "cpu",
    "level": "senior",
    "question": "Чем CPU affinity, nice и scheduler policy отличаются?",
    "answer": "Affinity ограничивает набор CPU для задачи. Nice влияет на относительный вес выполнения обычных задач при конкуренции, но не резервирует CPU и не является универсальным приоритетом всех scheduling policies. Реальные realtime policies SCHED_FIFO/RR имеют иные правила и могут вытеснить обычные задачи. Применять их без ограничений опасно для доступности.",
    "follow_up": "Почему nice -20 не гарантирует latency? Как проверить policy процесса?",
    "practice": "ps -p PID -o pid,ni,cls,rtprio,psr; taskset -pc PID; chrt -p PID.",
    "rubric": "Различать размещение, относительный вес и real-time policy.",
    "source": "https://man7.org/linux/man-pages/man7/sched.7.html"
  },
  {
    "id": "LNX-021",
    "topic": "Linux",
    "section": "cpu",
    "level": "senior",
    "question": "Что показывает PSI и чем он отличается от обычной утилизации ресурсов?",
    "answer": "Pressure Stall Information измеряет время, когда задачи теряют возможность продвигаться из-за нехватки CPU, memory или I/O. some отражает периоды ожидания хотя бы одной задачи; full, где применимо, периоды одновременного stall всех non-idle задач в scope. Высокий PSI помогает обнаружить ресурсное давление даже при неоднозначных средних utilisation.",
    "follow_up": "Как использовать avg10 и total? Где найти PSI для отдельной cgroup?",
    "practice": "cat /proc/pressure/cpu /proc/pressure/memory /proc/pressure/io; сравнить с cgroup pressure и SLI.",
    "rubric": "Объяснить stall time и scope, не путать с процентом занятости.",
    "source": "https://docs.kernel.org/accounting/psi.html"
  },
  {
    "id": "LNX-022",
    "topic": "Linux",
    "section": "cgroups",
    "level": "middle",
    "question": "Чем Linux namespaces отличаются от cgroups?",
    "answer": "Namespaces изолируют представление ресурсов, например PID, mount, network и user identity. Cgroups группируют процессы и позволяют учитывать и ограничивать потребление CPU, memory, I/O и число задач. Контейнер использует оба механизма вместе с настройками безопасности; один механизм не заменяет другой и не создаёт отдельное ядро.",
    "follow_up": "Что видит процесс в PID namespace? Как узнать cgroup текущего shell?",
    "practice": "lsns; cat /proc/self/cgroup; readlink /proc/self/ns/pid.",
    "rubric": "Различать изоляцию видимости и управление ресурсами, назвать shared kernel.",
    "source": "https://man7.org/linux/man-pages/man7/namespaces.7.html"
  },
  {
    "id": "LNX-023",
    "topic": "Linux",
    "section": "cgroups",
    "level": "senior",
    "question": "Как cgroup v2 cpu.max ограничивает CPU и чем отличается от cpu.weight?",
    "answer": "cpu.max задаёт quota и period либо max без жёсткой квоты. Например, 50000 100000 ограничивает группу примерно половиной CPU в среднем за период, с учётом правил иерархии. cpu.weight задаёт относительный вес конкурирующих групп, а не жёсткий предел. cpu.stat показывает в том числе события и время throttling.",
    "follow_up": "Почему группа может throttling при свободном CPU? Как влияет родительская cgroup?",
    "practice": "В своей тестовой cgroup прочитать cpu.max, cpu.weight, cpu.stat; сопоставить дельты счётчиков.",
    "rubric": "Различать quota, weight, иерархию и фактическое выполнение.",
    "source": "https://docs.kernel.org/admin-guide/cgroup-v2.html"
  },
  {
    "id": "LNX-024",
    "topic": "Linux",
    "section": "cgroups",
    "level": "senior",
    "question": "Чем memory.high отличается от memory.max в cgroup v2?",
    "answer": "memory.high является порогом давления: задачи ограничиваются через reclaim и задержки, но превышение само по себе не запускает OOM killer. memory.max задаёт жёсткое ограничение, при невозможности reclaim возможен cgroup OOM. memory.events и memory.stat помогают установить причину. Настройки должны учитывать родительские ограничения и рабочий набор.",
    "follow_up": "Для чего memory.low/min? Как заметить throttling до OOM?",
    "practice": "Читать memory.current, memory.high, memory.max, memory.events в выделенной группе.",
    "rubric": "Отличать мягкое давление от hard limit, не обещать невозможность временного превышения.",
    "source": "https://docs.kernel.org/admin-guide/cgroup-v2.html"
  },
  {
    "id": "LNX-025",
    "topic": "Linux",
    "section": "cgroups",
    "level": "senior",
    "question": "Почему создание новых процессов может получать EAGAIN при свободных CPU и RAM?",
    "answer": "Лимит pids.max в cgroup ограничивает число задач, включая потоки; fork/clone может получить EAGAIN при его исчерпании. Другие причины включают RLIMIT_NPROC и системные пределы PID/threads. Определи реальный scope, число задач и источник роста. systemd TasksMax часто реализуется через pids controller.",
    "follow_up": "Почему pids.current может быть больше числа процессов из ps? Что означает pids.events?",
    "practice": "cat /proc/PID/limits; прочитать pids.current/pids.max/pids.events соответствующей cgroup.",
    "rubric": "Различать потоки и процессы, проверить cgroup и process limits.",
    "source": "https://docs.kernel.org/admin-guide/cgroup-v2.html"
  },
  {
    "id": "LNX-026",
    "topic": "Linux",
    "section": "filesystem",
    "level": "middle",
    "question": "Чем inode отличается от имени файла и что происходит при hard link?",
    "answer": "Inode содержит метаданные и описывает данные объекта файловой системы, а directory entry связывает имя с inode. Hard link создаёт ещё одно имя того же inode в пределах поддерживаемой файловой системы. Удаление одного имени не удаляет другие ссылки; данные освобождаются после исчезновения ссылок и открытых ссылок ядра.",
    "follow_up": "Почему hard link обычно не работает между файловыми системами? Чем отличается symlink?",
    "practice": "В mktemp -d создать файл, ln и ln -s; сравнить ls -li и stat.",
    "rubric": "Объяснить directory entry, inode, link count и различие symlink.",
    "source": "https://man7.org/linux/man-pages/man7/inode.7.html"
  },
  {
    "id": "LNX-027",
    "topic": "Linux",
    "section": "filesystem",
    "level": "senior",
    "question": "Почему запись через rename может быть атомарной, но не гарантировать сохранность после потери питания?",
    "answer": "rename в пределах поддерживаемой файловой системы обеспечивает атомарную замену имени для наблюдателей. Это не равно durability: данные и метаданные могут оставаться в кеше. Для устойчивой замены обычно записывают временный файл, fsync его, rename и fsync каталога с учётом требований файловой системы и устройства. Между файловыми системами rename может вернуть EXDEV.",
    "follow_up": "Почему close не заменяет fsync? Что случится с уже открытым старым файлом?",
    "practice": "На временном каталоге проверить inode до/после rename; не имитировать отключение питания рабочего хоста.",
    "rubric": "Различать atomicity и durability, учитывать файл и родительский каталог.",
    "source": "https://man7.org/linux/man-pages/man2/fsync.2.html"
  },
  {
    "id": "LNX-028",
    "topic": "Linux",
    "section": "filesystem",
    "level": "senior",
    "question": "Почему файловая система может возвращать ENOSPC при наличии свободных гигабайтов?",
    "answer": "Закончиться могут inode, зарезервированное или доступное конкретному пользователю пространство, квота либо ресурсы метаданных конкретной FS. Сначала проверить df -h и df -i на фактическом mount, quota, filesystem-specific stats и ошибки ядра. Не удалять случайные файлы до понимания, какой ресурс исчерпан.",
    "follow_up": "Чем EDQUOT отличается от ENOSPC? Почему df для другой точки монтирования вводит в заблуждение?",
    "practice": "df -hT /path; df -i /path; findmnt -T /path; проверить квоты при наличии.",
    "rubric": "Проверять bytes, inode, mount и quota отдельно.",
    "source": "https://man7.org/linux/man-pages/man2/write.2.html"
  },
  {
    "id": "LNX-029",
    "topic": "Linux",
    "section": "filesystem",
    "level": "senior",
    "question": "Что означает mount namespace и почему df внутри контейнера отличается от df на хосте?",
    "answer": "Mount namespace задаёт собственное представление дерева монтирований. Контейнер может видеть overlay root и отдельные bind mounts или volumes, тогда как хост видит другие точки монтирования и реальные backing FS. Для диагностики нужно определить, какая файловая система обслуживает конкретный путь в нужном namespace.",
    "follow_up": "Как bind mount скрывает содержимое исходного каталога? Что показывает /proc/PID/mountinfo?",
    "practice": "findmnt -T /path; cat /proc/PID/mountinfo; сравнить с данными тестового контейнера.",
    "rubric": "Различать namespace, mount point и backing storage; не делать вывод по одному df.",
    "source": "https://man7.org/linux/man-pages/man7/mount_namespaces.7.html"
  },
  {
    "id": "LNX-030",
    "topic": "Linux",
    "section": "filesystem",
    "level": "senior",
    "question": "Как безопасно расширить LVM logical volume и файловую систему?",
    "answer": "Сначала определить цепочку device→PV→VG→LV→FS→mount, проверить backup и свободные extents. При необходимости увеличить физическое устройство и PV по процедуре платформы; затем LV и поддерживаемую файловую систему. XFS обычно растёт через xfs_growfs на смонтированной FS, ext4 — через resize2fs при подходящих условиях. Возможность online growth зависит от конфигурации; shrink XFS штатно не поддерживается.",
    "follow_up": "Почему lvextend без роста FS не увеличивает df? Когда использовать lvextend -r?",
    "practice": "Только в учебной VM: lsblk -f; pvs; vgs; lvs; findmnt; проверить ёмкость до/после по инструкции.",
    "rubric": "Различать слои и процедуры FS, не применять команды к неизвестному устройству.",
    "source": "https://man7.org/linux/man-pages/man8/lvextend.8.html"
  },
  {
    "id": "LNX-031",
    "topic": "Linux",
    "section": "filesystem",
    "level": "senior",
    "question": "Чем page cache, buffered I/O и direct I/O отличаются для дисковых операций?",
    "answer": "Обычный buffered I/O использует page cache: чтение может обслуживаться из RAM, запись сначала изменяет кеш и позднее сбрасывается на устройство. O_DIRECT старается обойти page cache для данных с требованиями к выравниванию и поведением, зависящим от FS. Direct I/O сам по себе не гарантирует durability: для этого нужны подходящие синхронные операции и гарантии устройства.",
    "follow_up": "Почему первый и повторный benchmark дают разные результаты? Чем O_DIRECT отличается от O_SYNC?",
    "practice": "На тестовом файле сравнить ограниченные buffered/direct тесты fio, размеры блоков и параметры кеша.",
    "rubric": "Различать кеширование, физическое I/O и гарантии устойчивости записи.",
    "source": "https://man7.org/linux/man-pages/man2/open.2.html"
  },
  {
    "id": "LNX-032",
    "topic": "Linux",
    "section": "filesystem",
    "level": "senior",
    "question": "Как отличить медленный диск от очереди запросов к диску по iostat?",
    "answer": "Сопоставить await (время обслуживания запросов вместе с ожиданием), aqu-sz (средняя глубина очереди), throughput и число операций. %util показывает занятость по учёту устройства, но на параллельных NVMe/RAID значение около 100% не обязательно означает исчерпание максимальной производительности. Сравнивать нужно с baseline и задержкой приложения.",
    "follow_up": "Почему высокая IOPS не означает проблему? Как влияет размер блока на throughput?",
    "practice": "iostat -xz 1; pidstat -d 1; сопоставить время и конкретное устройство с mount приложения.",
    "rubric": "Не оценивать современное устройство только по %util; отличать latency, IOPS и bandwidth.",
    "source": "https://man7.org/linux/man-pages/man1/iostat.1.html"
  },
  {
    "id": "LNX-033",
    "topic": "Linux",
    "section": "filesystem",
    "level": "senior",
    "question": "Что происходит, когда dirty pages накапливаются быстрее, чем диск успевает их записывать?",
    "answer": "Buffered writes создают dirty pages, writeback постепенно переносит их на storage. При росте грязных страниц ядро запускает фоновые сбросы и может ограничивать процессы, генерирующие запись. Наблюдаемая latency способна резко вырасти, когда быстрый кеш перестаёт скрывать недостаточную пропускную способность диска. Настраивать пороги следует после измерения нагрузки.",
    "follow_up": "Почему увеличение dirty_ratio может ухудшить хвост latency? Что измерять при batch-записи?",
    "practice": "grep -E 'Dirty|Writeback' /proc/meminfo; vmstat 1; iostat -xz 1.",
    "rubric": "Объяснить writeback, backpressure и отличие скорости записи в кеш от физического диска.",
    "source": "https://docs.kernel.org/admin-guide/sysctl/vm.html"
  },
  {
    "id": "LNX-034",
    "topic": "Linux",
    "section": "filesystem",
    "level": "senior",
    "question": "Почему файловая система внезапно стала read-only и как безопасно восстановить запись?",
    "answer": "Причинами могут быть настройки mount, remount после обнаружения ошибок FS или проблемы storage. Сначала определить mount options и события ядра, остановить или перенаправить запись, проверить состояние устройства и резервных копий. Восстановление выполняется по процедуре конкретной FS, часто offline. Принудительный remount rw без устранения причины опасен.",
    "follow_up": "Чем EROFS отличается от EACCES? Можно ли запускать fsck на смонтированной файловой системе?",
    "practice": "findmnt -T /path; journalctl -k; lsblk -f; на учебном образе проверить read-only mount.",
    "rubric": "Не назначать fsck или remount вслепую; учитывать FS и состояние данных.",
    "source": "https://man7.org/linux/man-pages/man8/fsck.8.html"
  },
  {
    "id": "LNX-035",
    "topic": "Linux",
    "section": "filesystem",
    "level": "lead",
    "question": "Как провести ротацию логов без потери данных и длительной остановки сервиса?",
    "answer": "Если приложение поддерживает reopen, logrotate может переименовать старый файл и создать новый, затем вызвать согласованный reload; старый дескриптор остаётся связан с прежним inode до закрытия. copytruncate копирует и обрезает исходный файл, но между операциями есть окно потери записей. Проверить владельца, права, объём, обработку многопоточности и политику retention.",
    "follow_up": "Когда нужен reopen вместо copytruncate? Как доказать, что процесс начал писать в новый файл?",
    "practice": "На тестовом writer проверить logrotate -d, inode и /proc/PID/fd до и после ротации.",
    "rubric": "Назвать риск гонки, проверить дескрипторы и не считать SIGHUP универсальным reopen.",
    "source": "https://man7.org/linux/man-pages/man8/logrotate.8.html"
  },
  {
    "id": "LNX-036",
    "topic": "Linux",
    "section": "filesystem",
    "level": "senior",
    "question": "Как связать высокий расход места с процессом, удерживающим удалённый файл?",
    "answer": "Удаление имени через unlink не освобождает блоки, пока файл остаётся открытым. Можно обнаружить дескрипторы удалённых файлов через lsof +L1 или /proc/PID/fd, оценить объём и владельца. После согласования выполнить reopen или штатный restart конкретного сервиса; обнуление произвольного дескриптора может повредить приложение.",
    "follow_up": "Почему повторный rm ничего не меняет? Как отличить deleted log от активного файла базы?",
    "practice": "На временном файле открыть FD в shell, удалить имя, проверить readlink /proc/$$/fd/N, закрыть FD.",
    "rubric": "Объяснить удержание inode и безопасное освобождение через владельца процесса.",
    "source": "https://man7.org/linux/man-pages/man2/unlink.2.html"
  },
  {
    "id": "LNX-037",
    "topic": "Linux",
    "section": "systemd",
    "level": "middle",
    "question": "Чем systemctl start, enable, daemon-reload и reload отличаются?",
    "answer": "start запускает unit сейчас, enable создаёт предусмотренные установкой связи для активации, например при загрузке; enable без --now не запускает сервис немедленно. daemon-reload перечитывает конфигурацию units менеджером systemd. reload просит работающий сервис перечитать свою конфигурацию, если это реализовано. Изменённый ExecStart обычно требует restart.",
    "follow_up": "Что делает enable --now? Нужно ли daemon-reload после изменения файла приложения?",
    "practice": "На учебном unit использовать systemctl cat, is-enabled, status и daemon-reload; не трогать системные сервисы.",
    "rubric": "Различать состояние менеджера, автозапуск, текущий процесс и конфигурацию приложения.",
    "source": "https://www.freedesktop.org/software/systemd/man/latest/systemctl.html"
  },
  {
    "id": "LNX-038",
    "topic": "Linux",
    "section": "systemd",
    "level": "senior",
    "question": "Почему After=postgresql.service не гарантирует запуск базы перед приложением?",
    "answer": "After задаёт порядок только для units, включённых в одну транзакцию запуска, но сам по себе не подтягивает зависимость. Wants или Requires определяют связь активации, а After — порядок. Даже успешный запуск unit базы не обязательно означает готовность принимать SQL; нужны корректный Type/notify или прикладной retry с ограничениями.",
    "follow_up": "Чем Wants отличается от Requires? Зачем After вместе с Requires?",
    "practice": "На паре тестовых units проверить systemctl show -p After -p Wants -p Requires и systemd-analyze critical-chain.",
    "rubric": "Различать ordering и requirement, учитывать прикладную готовность.",
    "source": "https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html"
  },
  {
    "id": "LNX-039",
    "topic": "Linux",
    "section": "systemd",
    "level": "senior",
    "question": "Чем Type=simple, exec, forking, oneshot и notify отличаются?",
    "answer": "simple считает сервис запущенным после создания основного процесса, exec ждёт успешного exec программы, forking ожидает завершения исходного процесса при daemonization, oneshot — завершения команды, notify — сообщения готовности от сервиса. Выбор определяет момент завершения startup job и обработку ошибок. notify требует поддержки соответствующего протокола приложением.",
    "follow_up": "Почему simple может сообщить успех до ошибки exec? Как выбирать Type для foreground daemon?",
    "practice": "На локальных тестовых units сравнить ActiveState, SubState и момент готовности.",
    "rubric": "Объяснить различия момента готовности и не считать любой active сервис доступным.",
    "source": "https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html"
  },
  {
    "id": "LNX-040",
    "topic": "Linux",
    "section": "systemd",
    "level": "senior",
    "question": "Как расследовать start-limit-hit и настроить контролируемый restart сервиса?",
    "answer": "Restart определяет условия повторного запуска, RestartSec задаёт паузу, StartLimitIntervalSec и StartLimitBurst ограничивают частоту стартов. При превышении лимита дальнейшая активация блокируется по правилам менеджера. Сначала выяснить первичную ошибку через journal и ExecMainStatus; после исправления при необходимости reset-failed сбрасывает счётчики. Бесконечный быстрый retry может усугубить отказ зависимости.",
    "follow_up": "Чем Restart=on-failure отличается от always? Почему reset-failed не устраняет причину?",
    "practice": "systemctl show demo.service -p Result -p NRestarts -p ExecMainStatus; journalctl -u demo.service.",
    "rubric": "Различать причину отказа и ограничение повторов; не снимать защиту без анализа.",
    "source": "https://www.freedesktop.org/software/systemd/man/latest/systemd.service.html"
  },
  {
    "id": "LNX-041",
    "topic": "Linux",
    "section": "systemd",
    "level": "senior",
    "question": "Почему команда работает из SSH, но падает в systemd service?",
    "answer": "Unit может запускаться от другого User/Group, с другим WorkingDirectory, PATH, environment, лимитами и sandbox restrictions. ExecStart не является обычной строкой Bash: shell operators и expansion имеют специальные правила. Сравни effective unit, журнал и контекст запуска, используя явные пути и корректные параметры, а не выдавая root как обход проблемы.",
    "follow_up": "Что означает status=203/EXEC? Почему нельзя просто добавить /bin/bash -c ко всему?",
    "practice": "systemctl cat demo.service; systemctl show demo.service -p User -p WorkingDirectory; journalctl -u demo.service.",
    "rubric": "Проверить права, путь, контекст и синтаксис ExecStart, не раскрывать секреты окружения.",
    "source": "https://www.freedesktop.org/software/systemd/man/latest/systemd.exec.html"
  },
  {
    "id": "LNX-042",
    "topic": "Linux",
    "section": "systemd",
    "level": "senior",
    "question": "Как создать drop-in для systemd unit и не потерять настройку при обновлении пакета?",
    "answer": "Использовать systemctl edit для overrides в /etc/systemd/system/UNIT.d, оставив поставляемый unit неизменным. Drop-in дополняет или переопределяет директивы по их правилам; списковые параметры вроде ExecStart для обычного service часто требуют пустого присваивания перед новой командой. Затем перечитать конфигурацию и контролируемо применить её, проверив итоговый unit.",
    "follow_up": "Чем systemctl edit отличается от edit --full? Как определить источник действующей настройки?",
    "practice": "systemctl cat demo.service; systemctl show -p FragmentPath -p DropInPaths demo.service; systemd-analyze verify для тестового файла.",
    "rubric": "Учитывать merge семантику директив и проверять итоговую конфигурацию.",
    "source": "https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html"
  },
  {
    "id": "LNX-043",
    "topic": "Linux",
    "section": "systemd",
    "level": "senior",
    "question": "Как systemd завершает сервис с несколькими дочерними процессами?",
    "answer": "По умолчанию KillMode=control-group позволяет завершать процессы unit через его cgroup. При остановке менеджер выполняет предусмотренный stop protocol и отправляет сигнал завершения, ожидает TimeoutStopSec, а затем может применить принудительный сигнал согласно настройкам. KillMode=process ограничивает область и рискует оставить потомков. Приложение должно реализовывать graceful shutdown.",
    "follow_up": "Как проверить зависший ExecStop? Что происходит с дочерними worker при restart?",
    "practice": "systemctl status demo.service; systemd-cgls; systemctl show -p KillMode -p TimeoutStopUSec demo.service.",
    "rubric": "Объяснить границы cgroup, grace period и последствия неполной остановки.",
    "source": "https://www.freedesktop.org/software/systemd/man/latest/systemd.kill.html"
  },
  {
    "id": "LNX-044",
    "topic": "Linux",
    "section": "systemd",
    "level": "middle",
    "question": "Как выбрать systemd timer вместо cron и учесть пропущенные запуски?",
    "answer": "Timer активирует связанный unit по календарю или монотонному интервалу. Persistent=true у календарного timer позволяет выполнить пропущенную активацию после восстановления активности таймера; это не воспроизведение каждого пропуска. Systemd даёт status, журнал и зависимости. Cron проще для отдельных расписаний, но требует отдельно продумать окружение, логирование и блокировку наложений.",
    "follow_up": "Чем OnCalendar отличается от OnUnitActiveSec? Что делает RandomizedDelaySec?",
    "practice": "systemd-analyze calendar 'Mon..Fri 04:00'; systemctl list-timers --all.",
    "rubric": "Различать календарное и интервальное расписание, пропуски и lifecycle service.",
    "source": "https://www.freedesktop.org/software/systemd/man/latest/systemd.timer.html"
  },
  {
    "id": "LNX-045",
    "topic": "Linux",
    "section": "systemd",
    "level": "senior",
    "question": "Как найти ошибку предыдущей загрузки и почему journalctl без фильтров неудобен?",
    "answer": "journalctl поддерживает фильтры по boot ID, unit, времени и полям журнала. Предыдущая загрузка доступна через -b -1 только если журнал сохранялся и не был удалён по retention. Для kernel сообщений использовать -k, для сервиса -u. Сопоставить timezone и хронологию, не считать отсутствие записи доказательством отсутствия события.",
    "follow_up": "Чем persistent и volatile journal storage отличаются? Как ограничить вывод за интервал?",
    "practice": "journalctl --list-boots; journalctl -b -1 -k; journalctl -u demo.service --since '1 hour ago'.",
    "rubric": "Выбрать фильтры, проверить доступность истории и не удалять доказательства.",
    "source": "https://www.freedesktop.org/software/systemd/man/latest/journalctl.html"
  },
  {
    "id": "LNX-046",
    "topic": "Linux",
    "section": "bash",
    "level": "middle",
    "question": "Почему \"$@\" отличается от $@ и \"$*\" в Bash?",
    "answer": "В двойных кавычках \"$@\" сохраняет каждый исходный аргумент отдельным словом, включая пробелы и пустые значения. \"$*\" объединяет параметры в одно слово с разделителем на основе IFS. Неквотированное $@ может подвергаться word splitting и pathname expansion. Для безопасной передачи аргументов в wrapper обычно использовать \"$@\".",
    "follow_up": "Как передать имя файла с пробелами и звездочкой? Что происходит с пустым аргументом?",
    "practice": "В локальном Bash определить функцию printf '<%s>\\n' \"$@\" и вызвать с 'a b', '*', ''.",
    "rubric": "Сохранять границы аргументов, отличать quoting от экранирования.",
    "source": "https://www.gnu.org/software/bash/manual/html_node/Special-Parameters.html"
  },
  {
    "id": "LNX-047",
    "topic": "Linux",
    "section": "bash",
    "level": "senior",
    "question": "Почему set -euo pipefail не гарантирует корректную обработку всех ошибок?",
    "answer": "errexit имеет исключения, например проверки if, отдельные части &&/|| и pipeline; поведение функций и subshell зависит от контекста и настроек. nounset выявляет некоторые обращения к отсутствующим переменным, pipefail позволяет получить ненулевой статус при ошибке звена pipeline. Скрипт всё равно должен проверять важные операции, ожидаемые ненулевые статусы, таймауты и очистку.",
    "follow_up": "Что произойдёт с grep при отсутствии совпадений? Почему false в if не останавливает shell?",
    "practice": "bash -c 'set -e; if false; then echo x; fi; echo survived'; сравнить с отдельным false.",
    "rubric": "Знать исключения errexit и не использовать strict mode вместо явного контракта ошибок.",
    "source": "https://www.gnu.org/software/bash/manual/html_node/The-Set-Builtin.html"
  },
  {
    "id": "LNX-048",
    "topic": "Linux",
    "section": "bash",
    "level": "senior",
    "question": "Как получить статус каждого процесса pipeline, а не только последней команды?",
    "answer": "По умолчанию Bash возвращает exit status последней команды pipeline. pipefail возвращает статус крайней справа завершившейся с ошибкой команды либо 0. Массив PIPESTATUS содержит отдельные статусы последнего foreground pipeline и должен считываться сразу, пока следующая команда его не изменила. Учитывай ожидаемые SIGPIPE при досрочном завершении потребителя.",
    "follow_up": "Почему producer | head может дать ненулевой статус при pipefail? Как сохранить PIPESTATUS?",
    "practice": "bash -c 'false | true; printf \"%s\\n\" \"${PIPESTATUS[@]}\"'; повторить с pipefail.",
    "rubric": "Различать итоговый статус и отдельные статусы; не скрывать ошибки producer.",
    "source": "https://www.gnu.org/software/bash/manual/html_node/Pipelines.html"
  },
  {
    "id": "LNX-049",
    "topic": "Linux",
    "section": "bash",
    "level": "middle",
    "question": "Почему порядок перенаправлений >file 2>&1 и 2>&1 >file имеет значение?",
    "answer": "Shell выполняет перенаправления слева направо. В первом случае stdout направляется в файл, затем stderr дублирует текущий stdout, поэтому оба идут в файл. Во втором stderr сначала дублирует исходный stdout, затем stdout меняет назначение на файл; stderr остаётся на исходном канале. Дескриптор дублируется, а не создаёт постоянную ссылку на номер FD.",
    "follow_up": "Что означает 2>/dev/null? Как отдельно сохранить stdout и stderr?",
    "practice": "В mktemp -d выполнить команду, печатающую в stdout и stderr, с обоими порядками перенаправления.",
    "rubric": "Правильно описать левосторонний порядок и копирование дескриптора.",
    "source": "https://www.gnu.org/software/bash/manual/html_node/Redirections.html"
  },
  {
    "id": "LNX-050",
    "topic": "Linux",
    "section": "bash",
    "level": "senior",
    "question": "Почему переменная, изменённая внутри while read в pipeline, может остаться прежней?",
    "answer": "Bash обычно выполняет звенья pipeline в отдельных subshell, поэтому изменение shell variable внутри цикла не возвращается в родительскую оболочку. Опция lastpipe может изменить поведение последнего звена в определённых условиях. Используй redirect или process substitution, если нужно сохранить состояние, и отдельно учитывай статус producer.",
    "follow_up": "Чем command substitution отличается от process substitution? Почему не использовать глобальную переменную для IPC?",
    "practice": "bash -c 'n=0; printf \"x\\n\" | while read -r x; do n=1; done; echo \"$n\"'; сравнить с read из файла.",
    "rubric": "Объяснить scope процесса и способ избежать потери состояния без зависимости от lastpipe.",
    "source": "https://www.gnu.org/software/bash/manual/html_node/Command-Execution-Environment.html"
  },
  {
    "id": "LNX-051",
    "topic": "Linux",
    "section": "bash",
    "level": "senior",
    "question": "Как сделать Bash-скрипт безопасным при параллельных запусках и неожиданной остановке?",
    "answer": "Выделить стабильный lock для операции, например flock на отдельном lockfile, удерживать FD до завершения критической секции. Создавать временные файлы через mktemp и удалять их в trap EXIT, обрабатывать TERM/INT по контракту. trap не выполнится при SIGKILL; устойчивость внешних изменений требует атомарных или идемпотентных операций. Не удалять lockfile, пока другие процессы могут держать его inode.",
    "follow_up": "Почему проверка существования файла не атомарная блокировка? Как выбирать таймаут flock?",
    "practice": "На локальном временном каталоге запустить два тестовых процесса с flock -n и сравнить статусы.",
    "rubric": "Различать mutual exclusion и crash recovery; не полагаться на trap при SIGKILL.",
    "source": "https://man7.org/linux/man-pages/man1/flock.1.html"
  },
  {
    "id": "LNX-052",
    "topic": "Linux",
    "section": "bash",
    "level": "senior",
    "question": "Как безопасно обойти список файлов с пробелами, переводами строк и ведущим дефисом?",
    "answer": "Не разбирать вывод ls и не использовать неквотированный for по command substitution. GNU find -print0 вместе с подходящим NUL-aware consumer или find -exec ... {} + сохраняет границы имён. В Bash можно применять read -r -d '' с корректным источником. Передавать имена как аргументы и использовать -- у команд, которые его поддерживают.",
    "follow_up": "Почему xargs без -0 небезопасен для произвольных имён? Что делать с пустым списком?",
    "practice": "В mktemp -d создать файлы с пробелом, ведущим дефисом и newline; проверить find -print0 и -exec.",
    "rubric": "Не смешивать текстовое представление с именами файлов; учитывать option injection.",
    "source": "https://www.gnu.org/software/findutils/manual/html_mono/find.html"
  },
  {
    "id": "LNX-053",
    "topic": "Linux",
    "section": "security",
    "level": "middle",
    "question": "Что означают права rwx на файле и каталоге, и как umask влияет на создание?",
    "answer": "Для файла r/w/x отвечают за чтение, изменение и исполнение. Для каталога r позволяет перечислять имена, x — проходить через каталог, w вместе с x — изменять записи каталога при выполнении прочих условий. Umask исключает биты из запрошенного режима создания, а default ACL может изменить результат. Права самого файла не определяют возможность удалить его имя.",
    "follow_up": "Почему файл 0444 можно удалить в доступном на запись каталоге? Что даёт sticky bit?",
    "practice": "В своём временном каталоге сравнить stat и доступ при разных umask; не менять системные права.",
    "rubric": "Различать операции с содержимым и directory entries, не считать chmod 777 нормальным решением.",
    "source": "https://man7.org/linux/man-pages/man2/umask.2.html"
  },
  {
    "id": "LNX-054",
    "topic": "Linux",
    "section": "security",
    "level": "senior",
    "question": "Как работают setuid, setgid и sticky bit и какие риски они создают?",
    "answer": "Setuid у исполняемого файла при допустимых условиях меняет effective UID на владельца файла; setgid может менять effective GID. Setgid на каталоге помогает наследовать группу новых объектов. Sticky bit на доступном для записи каталоге ограничивает удаление или переименование чужих записей. nosuid и no_new_privs способны ограничивать повышение привилегий.",
    "follow_up": "Чем effective UID отличается от real UID? Почему setuid shell script не стоит считать надёжным механизмом?",
    "practice": "stat /tmp; findmnt -T /tmp; изучить режимы файлов в собственном тестовом каталоге без создания привилегированного бинарника.",
    "rubric": "Назвать разные эффекты специальных битов и ограничения безопасности.",
    "source": "https://man7.org/linux/man-pages/man7/inode.7.html"
  },
  {
    "id": "LNX-055",
    "topic": "Linux",
    "section": "security",
    "level": "senior",
    "question": "Почему ACL выдаёт меньше прав, чем ожидается после setfacl?",
    "answer": "POSIX ACL содержит записи для пользователей и групп, а mask ограничивает эффективные права named users, named groups и owning group. Поэтому запись rwx может иметь effective r-x. chmod может изменять mask и тем самым эффективный доступ. Default ACL каталога влияет на наследование при создании, а не автоматически переписывает существующие файлы.",
    "follow_up": "К каким записям mask не применяется? Чем access ACL отличается от default ACL?",
    "practice": "На временном файле getfacl и setfacl для тестового пользователя; проверить effective permissions.",
    "rubric": "Понимать mask, inheritance и взаимодействие chmod/ACL.",
    "source": "https://man7.org/linux/man-pages/man5/acl.5.html"
  },
  {
    "id": "LNX-056",
    "topic": "Linux",
    "section": "security",
    "level": "senior",
    "question": "Как выдать сервису возможность слушать низкий TCP-порт без запуска от root?",
    "answer": "При необходимости использовать минимальную CAP_NET_BIND_SERVICE через поддерживаемую конфигурацию systemd или иной подход, например reverse proxy/socket activation. Учитывать net.ipv4.ip_unprivileged_port_start в соответствующем network namespace: традиционная граница 1024 может быть изменена. Capability не должна распространяться на ненужные операции; проверить effective sets и конфигурацию sandbox.",
    "follow_up": "Почему выдача CAP_SYS_ADMIN избыточна? Что происходит с file capabilities при no_new_privs?",
    "practice": "На тестовой системе посмотреть getcap, /proc/PID/status и sysctl net.ipv4.ip_unprivileged_port_start.",
    "rubric": "Объяснить least privilege и версионно-конфигурационные особенности привилегированных портов.",
    "source": "https://man7.org/linux/man-pages/man7/capabilities.7.html"
  },
  {
    "id": "LNX-057",
    "topic": "Linux",
    "section": "security",
    "level": "senior",
    "question": "Почему SELinux может запрещать доступ при корректных chmod и владельце?",
    "answer": "DAC проверяет традиционные права, SELinux добавляет обязательную политику доступа по security contexts и типам. Даже root или процесс с корректным DAC может получить отказ согласно действующей политике. Исследуй AVC, контекст процесса и объекта, восстанови ожидаемую маркировку через согласованный restorecon или настройку semanage fcontext. Не отключай enforcing ради устранения симптома.",
    "follow_up": "Чем chcon отличается от постоянного fcontext? Почему audit2allow не следует применять вслепую?",
    "practice": "На RHEL-совместимой учебной VM: getenforce; ls -Z; ps -eZ; ausearch -m AVC -ts recent.",
    "rubric": "Различать DAC/MAC, проверять AVC и исправлять причину с минимальным расширением доступа.",
    "source": "https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/index"
  },
  {
    "id": "LNX-058",
    "topic": "Linux",
    "section": "troubleshooting",
    "level": "lead",
    "question": "Сервис отвечает медленно после релиза, но CPU, RAM и диск по дашборду выглядят нормально. Что делать?",
    "answer": "Зафиксировать масштаб и p95/p99, сравнить версии и последние изменения. Разделить время на сетевую часть, очередь, выполнение и downstream. Проверить per-thread/off-CPU ожидания, FD, cgroup throttling, DNS/TLS и пул соединений, используя минимально инвазивные измерения. Выдвинуть проверяемые гипотезы, при нарушении SLO выбрать обратимую mitigation и сравнить результат.",
    "follow_up": "Как исключить ошибку агрегации метрик? Когда профилирование оправдано?",
    "practice": "Составить timeline, собрать ограниченные pidstat/ss/PSI данные на учебном инциденте, проверить latency до и после исправления.",
    "rubric": "Связать SLI с конкретным доказательством, контролировать overhead и recovery.",
    "source": "https://docs.kernel.org/accounting/psi.html"
  },
  {
    "id": "LNX-059",
    "topic": "Linux",
    "section": "troubleshooting",
    "level": "senior",
    "question": "Когда выбирать strace, perf и eBPF для расследования Linux-инцидента?",
    "answer": "strace наблюдает системные вызовы и их результаты, полезен для поиска ожиданий I/O и ошибок, но может заметно влиять на syscall-heavy workload. perf использует доступные счётчики и sampling для профилирования CPU и других событий. eBPF позволяет строить целевые наблюдения в ядре при поддержке и правах. Выбор определяется гипотезой, допустимым overhead и защитой данных.",
    "follow_up": "Почему strace не показывает время выполнения чистого пользовательского кода напрямую? Что измеряет sampling?",
    "practice": "На собственном тестовом процессе сравнить strace -c и perf stat при наличии разрешений.",
    "rubric": "Назвать ограничения инструментов, не обещать нулевой overhead и не собирать секреты.",
    "source": "https://man7.org/linux/man-pages/man1/perf-stat.1.html"
  },
  {
    "id": "LNX-060",
    "topic": "Linux",
    "section": "troubleshooting",
    "level": "lead",
    "question": "Как диагностировать внезапное исчезновение Linux-сервера после перезагрузки и отделить отказ ОС от инфраструктуры?",
    "answer": "Сначала проверить независимые каналы: состояние VM/гипервизора, консоль, доступность сети и endpoint. Если консоль доступна, определить стадию boot, ошибки initramfs/root FS, состояние systemd и конфигурацию сети. Сохранить журналы и снимки состояния; использовать предусмотренный recovery path, не выполнять повторные перезагрузки без гипотезы. После восстановления подтвердить доступность сервиса и данные.",
    "follow_up": "Что делать, если предыдущий journal не сохранился? Как определить критерий эскалации к сетевикам?",
    "practice": "В отдельной VM отработать просмотр boot journal и console, собрать timeline и письменный RCA.",
    "rubric": "Разделить инфраструктуру, boot, сеть и приложение; требовать evidence и безопасное восстановление.",
    "source": "https://www.freedesktop.org/software/systemd/man/latest/bootup.html"
  }
];
