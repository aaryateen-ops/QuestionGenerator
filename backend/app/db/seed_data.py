from sqlalchemy.orm import Session
from app.models.entities import Subject, SyllabusUnit, CourseOutcome, Question, User
from app.core.security import hash_password
from app.engine.bloom_classifier import BloomClassifierEngine

SUBJECTS_SEED_DATA = [
    # =========================================================================
    # SUBJECT 1: Data Structures and Algorithms (CS8491)
    # =========================================================================
    {
        "subject": {
            "code": "CS8491",
            "name": "Data Structures and Algorithms",
            "department": "Department of Artificial Intelligence & Data Science",
            "semester": 4,
            "regulation": "Autonomous - CBCS"
        },
        "units": [
            {
                "unit_number": 1,
                "title": "Linear Data Structures - Stacks, Queues & Linked Lists",
                "description": "Abstract Data Types, Singly and Doubly Linked Lists, Stack ADT, Infix to Postfix conversion, Queue ADT, Circular Queues, Deque and Applications."
            },
            {
                "unit_number": 2,
                "title": "Tree Data Structures & Hierarchical Indexing",
                "description": "Tree Terminologies, Binary Tree Traversals, Binary Search Trees, AVL Trees, Balance Factors, Rotations, B-Trees, B+ Trees and Priority Queues."
            },
            {
                "unit_number": 3,
                "title": "Graph Algorithms & Shortest Path Problems",
                "description": "Graph Representations, BFS, DFS, Topological Sorting, Dijkstra's Shortest Path, Bellman-Ford, Prim's and Kruskal's Minimum Spanning Tree."
            },
            {
                "unit_number": 4,
                "title": "Sorting, Searching & Hashing Techniques",
                "description": "Internal and External Sorting, Insertion Sort, Quick Sort, Merge Sort, Heap Sort, Linear/Binary Search, Hash Functions, Collision Resolution."
            },
            {
                "unit_number": 5,
                "title": "Algorithm Design Strategies & Complexity Classes",
                "description": "Divide and Conquer, Greedy Method, Dynamic Programming (0/1 Knapsack, LCS), Backtracking (N-Queens), P, NP, NP-Complete and NP-Hard classes."
            }
        ],
        "course_outcomes": [
            {
                "code": "CO1",
                "description": "Understand and implement abstract linear data structures including stacks, queues, and linked lists for problem solving.",
                "target_bloom_level": "L3"
            },
            {
                "code": "CO2",
                "description": "Design and apply hierarchical tree structures and self-balancing mechanisms for efficient data indexing and retrieval.",
                "target_bloom_level": "L4"
            },
            {
                "code": "CO3",
                "description": "Analyze and solve network and connectivity problems using graph traversal and shortest path optimization algorithms.",
                "target_bloom_level": "L4"
            },
            {
                "code": "CO4",
                "description": "Evaluate and implement efficient searching, sorting, and collision-resistant hashing techniques for large datasets.",
                "target_bloom_level": "L5"
            },
            {
                "code": "CO5",
                "description": "Formulate optimal computational solutions using greedy, dynamic programming, and backtracking paradigms and analyze asymptotic complexity.",
                "target_bloom_level": "L6"
            }
        ],
        "questions": [
            # UNIT 1
            {"unit": 1, "marks": 2, "difficulty": "EASY", "text": "Define an Abstract Data Type (ADT) and cite two practical examples."},
            {"unit": 1, "marks": 2, "difficulty": "EASY", "text": "State the primary advantages of a doubly linked list over a singly linked list."},
            {"unit": 1, "marks": 2, "difficulty": "MEDIUM", "text": "Describe the condition required for detecting queue overflow and underflow in a circular queue."},
            {"unit": 1, "marks": 2, "difficulty": "MEDIUM", "text": "Convert the infix expression (A + B) * (C - D) / E into its postfix equivalent."},
            {"unit": 1, "marks": 2, "difficulty": "EASY", "text": "List four real-world applications of the stack data structure in computer systems."},
            {"unit": 1, "marks": 2, "difficulty": "HARD", "text": "Calculate the time complexity of reversing a singly linked list in-place using iterative pointers."},
            {"unit": 1, "marks": 2, "difficulty": "MEDIUM", "text": "Explain why array-based queues encounter false overflow and how circular queues mitigate it."},
            {"unit": 1, "marks": 2, "difficulty": "EASY", "text": "Identify the difference between linear search and binary search in terms of prerequisite conditions."},
            {"unit": 1, "marks": 10, "difficulty": "MEDIUM", "text": "Explain the algorithm for converting an infix expression to a postfix expression using a stack, and trace the evaluation for ((A + B) * C - (D - E)) ^ (F + G)."},
            {"unit": 1, "marks": 10, "difficulty": "HARD", "text": "Design and implement a complete Circular Doubly Linked List with operations for inserting at the head, deleting a specified node, and displaying in reverse order."},
            {"unit": 1, "marks": 10, "difficulty": "MEDIUM", "text": "Demonstrate the implementation of a Double-Ended Queue (Deque) using a circular array with boundary handling for both ends."},
            {"unit": 1, "marks": 10, "difficulty": "HARD", "text": "Compare and contrast array-based and pointer-based implementations of Stacks and Queues with respect to memory overhead and cache locality."},
            {"unit": 1, "marks": 10, "difficulty": "HARD", "text": "Design an algorithm to detect and remove a loop in a singly linked list without utilizing additional storage space."},
            {"unit": 1, "marks": 10, "difficulty": "MEDIUM", "text": "Formulate a stack-based algorithm to evaluate a postfix expression containing multiple arithmetic operators and illustrate with a step-by-step trace table."},

            # UNIT 2
            {"unit": 2, "marks": 2, "difficulty": "EASY", "text": "Define balance factor in an AVL tree and state its valid numerical range."},
            {"unit": 2, "marks": 2, "difficulty": "EASY", "text": "List the properties of a strictly binary tree with n leaf nodes."},
            {"unit": 2, "marks": 2, "difficulty": "MEDIUM", "text": "Explain why B-Trees are preferred over standard Binary Search Trees for disk-based database indexing."},
            {"unit": 2, "marks": 2, "difficulty": "MEDIUM", "text": "Calculate the maximum number of nodes possible in a binary tree of height h."},
            {"unit": 2, "marks": 2, "difficulty": "EASY", "text": "State the min-heap property and show how a min-heap is represented as a sequential array."},
            {"unit": 2, "marks": 2, "difficulty": "HARD", "text": "Differentiate between LL and LR rotations in an AVL tree with minimal illustrative node diagrams."},
            {"unit": 2, "marks": 2, "difficulty": "MEDIUM", "text": "Describe the in-order traversal procedure for obtaining sorted keys from a Binary Search Tree."},
            {"unit": 2, "marks": 2, "difficulty": "HARD", "text": "Identify the minimum and maximum number of keys in a B-Tree node of order m."},
            {"unit": 2, "marks": 10, "difficulty": "HARD", "text": "Construct an AVL tree by inserting the following sequence of keys step-by-step: 64, 1, 44, 26, 13, 110, 98, 85. Clearly specify each rotation performed."},
            {"unit": 2, "marks": 10, "difficulty": "MEDIUM", "text": "Explain the operations of inserting a key and deleting a node with two children in a Binary Search Tree with detailed pseudo-code and diagrams."},
            {"unit": 2, "marks": 10, "difficulty": "HARD", "text": "Design a B-Tree of order 5 and demonstrate step-by-step key insertions for the elements: 10, 20, 30, 40, 50, 60, 70, 80, 90. Detail node splitting events."},
            {"unit": 2, "marks": 10, "difficulty": "HARD", "text": "Evaluate the suitability of Splay Trees versus AVL Trees in caching scenarios where recently accessed elements have high access probability."},
            {"unit": 2, "marks": 10, "difficulty": "MEDIUM", "text": "Demonstrate the construction of a Max Heap using the bottom-up heapify algorithm for the array: [16, 4, 10, 14, 7, 9, 3, 2, 8, 1]. Calculate total runtime complexity."},
            {"unit": 2, "marks": 10, "difficulty": "HARD", "text": "Compare and contrast B-Trees and B+ Trees in terms of internal node structure, range queries, and sequential leaf access."},

            # UNIT 3
            {"unit": 3, "marks": 2, "difficulty": "EASY", "text": "Define a Directed Acyclic Graph (DAG) and mention its significance in scheduling."},
            {"unit": 3, "marks": 2, "difficulty": "EASY", "text": "State the space complexity of representing a graph with V vertices and E edges using an adjacency matrix versus an adjacency list."},
            {"unit": 3, "marks": 2, "difficulty": "MEDIUM", "text": "Explain why Dijkstra's algorithm fails to yield correct shortest paths when negative weight edges are present."},
            {"unit": 3, "marks": 2, "difficulty": "MEDIUM", "text": "Calculate the number of edges in a connected undirected graph with n vertices to qualify as a tree."},
            {"unit": 3, "marks": 2, "difficulty": "HARD", "text": "Differentiate between Breadth-First Search (BFS) and Depth-First Search (DFS) in terms of auxiliary data structures required."},
            {"unit": 3, "marks": 2, "difficulty": "EASY", "text": "List the cut-property principle utilized in Prim's algorithm for finding minimum spanning trees."},
            {"unit": 3, "marks": 2, "difficulty": "MEDIUM", "text": "Describe the concept of topological sorting and identify which graphs admit a valid topological ordering."},
            {"unit": 3, "marks": 2, "difficulty": "HARD", "text": "Compare Kruskal's algorithm and Prim's algorithm regarding their efficiency on sparse versus dense graphs."},
            {"unit": 3, "marks": 10, "difficulty": "HARD", "text": "Calculate the single-source shortest paths from vertex S using Dijkstra's algorithm for a given 6-vertex weighted directed graph. Provide distance table after each iteration."},
            {"unit": 3, "marks": 10, "difficulty": "HARD", "text": "Explain Kruskal's Minimum Spanning Tree algorithm using Disjoint Set Union (Union-Find) with path compression and rank heuristics, and compute the MST for a 7-vertex graph."},
            {"unit": 3, "marks": 10, "difficulty": "MEDIUM", "text": "Demonstrate Breadth-First Search (BFS) and Depth-First Search (DFS) traversals on a given undirected graph starting from node A. Show queue and stack states at each transition."},
            {"unit": 3, "marks": 10, "difficulty": "HARD", "text": "Design an algorithm using the Bellman-Ford method to detect negative weight cycles in a directed graph and trace its dynamic relaxation steps over V-1 iterations."},
            {"unit": 3, "marks": 10, "difficulty": "HARD", "text": "Analyze the Floyd-Warshall all-pairs shortest path algorithm. Formulate its recurrence relation and compute the final shortest path matrix for a 4-node directed graph."},
            {"unit": 3, "marks": 10, "difficulty": "MEDIUM", "text": "Formulate a topological sort algorithm using Kahn's in-degree queue-based method and apply it to a task dependency graph with 8 activities."},

            # UNIT 4
            {"unit": 4, "marks": 2, "difficulty": "EASY", "text": "Define a hash collision and name two fundamental collision resolution techniques."},
            {"unit": 4, "marks": 2, "difficulty": "EASY", "text": "State the best-case, average-case, and worst-case time complexities of QuickSort."},
            {"unit": 4, "marks": 2, "difficulty": "MEDIUM", "text": "Explain why MergeSort is preferred over QuickSort for sorting external linked lists."},
            {"unit": 4, "marks": 2, "difficulty": "MEDIUM", "text": "Calculate the hash indices for keys 23, 45, 12, 89 using the division hash method h(k) = k mod 11."},
            {"unit": 4, "marks": 2, "difficulty": "HARD", "text": "Differentiate between linear probing and quadratic probing in addressing the primary clustering phenomenon."},
            {"unit": 4, "marks": 2, "difficulty": "EASY", "text": "List the conditions under which binary search operates correctly on an array."},
            {"unit": 4, "marks": 2, "difficulty": "MEDIUM", "text": "Describe the concept of a stable sorting algorithm and name two stable sorting methods."},
            {"unit": 4, "marks": 2, "difficulty": "HARD", "text": "Compare separate chaining and open addressing in terms of load factor tolerance and memory utilization."},
            {"unit": 4, "marks": 10, "difficulty": "MEDIUM", "text": "Explain the QuickSort algorithm with Lomuto or Hoare partitioning. Trace the complete recursive sorting execution for the array [38, 27, 43, 3, 9, 82, 10]."},
            {"unit": 4, "marks": 10, "difficulty": "HARD", "text": "Demonstrate the HeapSort algorithm step-by-step for the dataset [12, 11, 13, 5, 6, 7]. Include max-heap construction and subsequent root extraction phases."},
            {"unit": 4, "marks": 10, "difficulty": "HARD", "text": "Design a collision-resistant Hash Table utilizing Double Hashing with primary hash h1(k) = k mod 13 and secondary hash h2(k) = 7 - (k mod 7). Trace insertions for keys: 18, 26, 35, 9, 64, 47, 32."},
            {"unit": 4, "marks": 10, "difficulty": "HARD", "text": "Evaluate the time and space complexity trade-offs between MergeSort and In-Place QuickSort, including worst-case pivot degradation and mitigation strategies."},
            {"unit": 4, "marks": 10, "difficulty": "MEDIUM", "text": "Compare and contrast Linear Search, Binary Search, and Hashing techniques with respect to search, insert, and delete performance under varying dataset distributions."},
            {"unit": 4, "marks": 10, "difficulty": "HARD", "text": "Formulate the MergeSort divide-and-conquer recurrence relation. Solve it using the Master Theorem and trace the merge step for an 8-element array."},

            # UNIT 5
            {"unit": 5, "marks": 2, "difficulty": "EASY", "text": "Define the principle of optimality in the context of Dynamic Programming."},
            {"unit": 5, "marks": 2, "difficulty": "EASY", "text": "State the difference between P and NP complexity classes."},
            {"unit": 5, "marks": 2, "difficulty": "MEDIUM", "text": "Explain the difference between divide-and-conquer and dynamic programming approaches."},
            {"unit": 5, "marks": 2, "difficulty": "MEDIUM", "text": "Calculate the prefix codes for characters with given frequencies using Huffman coding."},
            {"unit": 5, "marks": 2, "difficulty": "HARD", "text": "Differentiate between NP-Complete and NP-Hard problem classes with one standard example of each."},
            {"unit": 5, "marks": 2, "difficulty": "EASY", "text": "List the primary criteria required for a problem to be solved using a greedy heuristic."},
            {"unit": 5, "marks": 2, "difficulty": "MEDIUM", "text": "Describe the state-space tree exploration mechanism employed in backtracking algorithms."},
            {"unit": 5, "marks": 2, "difficulty": "HARD", "text": "Compare 0/1 Knapsack and Fractional Knapsack in terms of optimal substructure and greedy solvability."},
            {"unit": 5, "marks": 10, "difficulty": "HARD", "text": "Solve the 0/1 Knapsack problem using Dynamic Programming for capacity W = 8 and items: {(2kg, $12), (3kg, $10), (4kg, $20), (5kg, $15)}. Construct the DP memoization table and trace selected items."},
            {"unit": 5, "marks": 10, "difficulty": "HARD", "text": "Design a dynamic programming solution for finding the Longest Common Subsequence (LCS) between strings X = 'BDCABA' and Y = 'ABCBDAB'. Trace the table and print optimal subsequence."},
            {"unit": 5, "marks": 10, "difficulty": "HARD", "text": "Explain the Matrix Chain Multiplication problem. Formulate the dynamic programming recurrence and compute the optimal parenthesization for matrices with dimensions 10x30, 30x5, 5x60."},
            {"unit": 5, "marks": 10, "difficulty": "HARD", "text": "Design a Backtracking algorithm to solve the 8-Queens problem. Show how bounding functions prune invalid branch paths in the state-space tree."},
            {"unit": 5, "marks": 10, "difficulty": "HARD", "text": "Evaluate the Fractional Knapsack greedy approach versus the 0/1 Knapsack dynamic programming approach through mathematical proof and concrete counterexamples."},
            {"unit": 5, "marks": 10, "difficulty": "HARD", "text": "Formulate a Huffman Tree for a text containing frequencies: A: 45, B: 13, C: 12, D: 16, E: 9, F: 5. Generate prefix codes and compute average code word length."}
        ]
    },

    # =========================================================================
    # SUBJECT 2: Artificial Intelligence & Machine Learning (AI3401)
    # =========================================================================
    {
        "subject": {
            "code": "AI3401",
            "name": "Artificial Intelligence & Machine Learning",
            "department": "Department of Artificial Intelligence & Data Science",
            "semester": 4,
            "regulation": "Autonomous - CBCS"
        },
        "units": [
            {
                "unit_number": 1,
                "title": "Problem Formulation & Heuristic Search Strategies",
                "description": "Intelligent Agents, State Space Search, Uninformed Search (BFS, DFS, IDS), Informed Search (A* Algorithm, Admissible Heuristics, IDA*), Adversarial Search, Minimax with Alpha-Beta Pruning."
            },
            {
                "unit_number": 2,
                "title": "Knowledge Representation & Automated Inference",
                "description": "Propositional Logic, First Order Predicate Logic, Unification, Forward and Backward Chaining, Resolution Refutation, Ontological Engineering, Dempster-Shafer Theory."
            },
            {
                "unit_number": 3,
                "title": "Supervised Learning Models & Classification",
                "description": "Linear Regression, Gradient Descent, Logistic Regression, Decision Trees (ID3, C4.5), Information Gain, Random Forests, Support Vector Machines (Kernel Trick), Naive Bayes Classifier."
            },
            {
                "unit_number": 4,
                "title": "Unsupervised Learning & Deep Neural Architectures",
                "description": "K-Means Clustering, Hierarchical Clustering, Principal Component Analysis (PCA), Single-Layer Perceptron, Multi-Layer Perceptrons, Error Backpropagation Algorithm, CNN Fundamentals."
            },
            {
                "unit_number": 5,
                "title": "Reinforcement Learning & Trustworthy AI Governance",
                "description": "Markov Decision Processes (MDP), Bellman Optimality Equation, Value Iteration, Policy Iteration, Temporal Difference Learning, Q-Learning, AI Ethics, Algorithmic Bias, Explainability (XAI)."
            }
        ],
        "course_outcomes": [
            {
                "code": "CO1",
                "description": "Formulate computational search spaces and implement optimal heuristic search and game-playing algorithms.",
                "target_bloom_level": "L3"
            },
            {
                "code": "CO2",
                "description": "Construct formal knowledge representations using first-order logic and perform automated inference using resolution.",
                "target_bloom_level": "L4"
            },
            {
                "code": "CO3",
                "description": "Analyze, train, and evaluate supervised machine learning classifiers for high-dimensional predictive modeling.",
                "target_bloom_level": "L4"
            },
            {
                "code": "CO4",
                "description": "Design unsupervised clustering models and multi-layer neural architectures using backpropagation optimization.",
                "target_bloom_level": "L5"
            },
            {
                "code": "CO5",
                "description": "Evaluate reinforcement learning policies using Bellman equations and audit intelligent systems for ethical fairness and transparency.",
                "target_bloom_level": "L6"
            }
        ],
        "questions": [
            # UNIT 1
            {"unit": 1, "marks": 2, "difficulty": "EASY", "text": "Define admissibility and consistency conditions for a heuristic function in A* search."},
            {"unit": 1, "marks": 2, "difficulty": "EASY", "text": "State the PEAS description for an Automated Autonomous Taxi driving system."},
            {"unit": 1, "marks": 2, "difficulty": "MEDIUM", "text": "Explain the role of alpha and beta cutoff thresholds in pruning minimax game trees."},
            {"unit": 1, "marks": 2, "difficulty": "MEDIUM", "text": "Calculate the effective branching factor if a search tree expands 25 nodes at depth 2."},
            {"unit": 1, "marks": 2, "difficulty": "HARD", "text": "Differentiate between Greedy Best-First Search and A* Search in terms of space complexity."},
            {"unit": 1, "marks": 10, "difficulty": "HARD", "text": "Explain the A* search algorithm in detail. Trace the optimal path finding execution on an 8-Puzzle grid from start state to goal state using the Manhattan distance heuristic."},
            {"unit": 1, "marks": 10, "difficulty": "HARD", "text": "Demonstrate the Minimax algorithm with Alpha-Beta Pruning on a 4-level adversarial game tree with 16 terminal leaves. Clearly show which branches are pruned and why."},
            {"unit": 1, "marks": 10, "difficulty": "MEDIUM", "text": "Compare and contrast Breadth-First Search, Depth-First Search, and Iterative Deepening Search with respect to completeness, time complexity, and memory optimality."},

            # UNIT 2
            {"unit": 2, "marks": 2, "difficulty": "EASY", "text": "Define horn clauses and explain their computational efficiency in forward chaining."},
            {"unit": 2, "marks": 2, "difficulty": "EASY", "text": "State the conversion rule for transforming existential quantifiers into Skolem constants or functions."},
            {"unit": 2, "marks": 2, "difficulty": "MEDIUM", "text": "Explain the principle of resolution refutation in propositional logic with a simple clause contradiction."},
            {"unit": 2, "marks": 2, "difficulty": "MEDIUM", "text": "Convert the English sentence 'Every intelligent student passes all exams' into First-Order Predicate Logic."},
            {"unit": 2, "marks": 2, "difficulty": "HARD", "text": "Differentiate between monotonic and non-monotonic reasoning systems with one real-world example."},
            {"unit": 2, "marks": 10, "difficulty": "HARD", "text": "Prove that 'Marcus is not alive' using Resolution Refutation in First-Order Logic given the facts: Marcus was a man, Marcus was a Pompeian, All Pompeians were Romans, Caesar was a ruler, All Romans were either loyal to Caesar or hated him, Everyone is loyal to someone, People only try to assassinate rulers they are not loyal to, and Marcus tried to assassinate Caesar."},
            {"unit": 2, "marks": 10, "difficulty": "MEDIUM", "text": "Explain the Unification Algorithm in First-Order Logic. Compute the Most General Unifier (MGU) for the pair: P(x, f(y), B) and P(A, z, w)."},
            {"unit": 2, "marks": 10, "difficulty": "HARD", "text": "Design a Semantic Network and Frame-based representation scheme for an Academic University ecosystem detailing inheritance relationships between faculties, courses, and students."},

            # UNIT 3
            {"unit": 3, "marks": 2, "difficulty": "EASY", "text": "Define Information Gain and Entropy in the context of Decision Tree construction."},
            {"unit": 3, "marks": 2, "difficulty": "EASY", "text": "State the mathematical formula for the Sigmoid activation function and its derivative."},
            {"unit": 3, "marks": 2, "difficulty": "MEDIUM", "text": "Explain the bias-variance trade-off in supervised learning and show how regularization controls overfitting."},
            {"unit": 3, "marks": 2, "difficulty": "MEDIUM", "text": "Calculate the posterior probability P(Spam | W1, W2) using Naive Bayes classifier given prior probabilities."},
            {"unit": 3, "marks": 2, "difficulty": "HARD", "text": "Differentiate between L1 Lasso Regularization and L2 Ridge Regularization in feature selection capability."},
            {"unit": 3, "marks": 10, "difficulty": "HARD", "text": "Construct a Decision Tree using the ID3 algorithm for the PlayTennis dataset with 14 rows across attributes: Outlook, Temperature, Humidity, and Wind. Calculate the Information Gain for each root split."},
            {"unit": 3, "marks": 10, "difficulty": "HARD", "text": "Explain the mathematical formulation of Support Vector Machines (SVM). Derive the soft-margin dual optimization problem and explain the Mercer condition for Kernel functions (RBF, Polynomial)."},
            {"unit": 3, "marks": 10, "difficulty": "MEDIUM", "text": "Demonstrate the step-by-step derivation of Gradient Descent weight update equations for Multiple Linear Regression minimizing the Mean Squared Error (MSE) cost function."},

            # UNIT 4
            {"unit": 4, "marks": 2, "difficulty": "EASY", "text": "Define the Perceptron learning rule and state the condition under which convergence is guaranteed."},
            {"unit": 4, "marks": 2, "difficulty": "EASY", "text": "State why single-layer perceptrons fail to solve the non-linear XOR classification problem."},
            {"unit": 4, "marks": 2, "difficulty": "MEDIUM", "text": "Explain the difference between K-Means clustering and agglomerative hierarchical clustering."},
            {"unit": 4, "marks": 2, "difficulty": "MEDIUM", "text": "Calculate the principal eigenvectors for a given 2x2 covariance matrix to reduce dimension from 2D to 1D."},
            {"unit": 4, "marks": 2, "difficulty": "HARD", "text": "Differentiate between Max Pooling and Average Pooling operations in Convolutional Neural Networks."},
            {"unit": 4, "marks": 10, "difficulty": "HARD", "text": "Derive the Error Backpropagation algorithm for a Multi-Layer Perceptron (MLP) with one hidden layer. Formulate the gradient expressions for both output and hidden layer weights using the chain rule."},
            {"unit": 4, "marks": 10, "difficulty": "HARD", "text": "Demonstrate K-Means clustering on the 2D dataset: [(2,10), (2,5), (8,4), (5,8), (7,5), (6,4), (1,2), (4,9)] with K=3 initial centroids. Trace cluster reassignments through two full iterations."},
            {"unit": 4, "marks": 10, "difficulty": "HARD", "text": "Analyze Principal Component Analysis (PCA) as an unsupervised dimensionality reduction method. Provide mathematical formulation including data centering, covariance matrix computation, and projection."},

            # UNIT 5
            {"unit": 5, "marks": 2, "difficulty": "EASY", "text": "Define a Markov Decision Process (MDP) and list its five formal tuple elements (S, A, P, R, gamma)."},
            {"unit": 5, "marks": 2, "difficulty": "EASY", "text": "State the Bellman Optimality Equation for the state-value function V*(s)."},
            {"unit": 5, "marks": 2, "difficulty": "MEDIUM", "text": "Explain the exploration versus exploitation dilemma in Reinforcement Learning and describe epsilon-greedy action selection."},
            {"unit": 5, "marks": 2, "difficulty": "MEDIUM", "text": "Calculate the discounted return G_t for a sequence of rewards with discount factor gamma = 0.9."},
            {"unit": 5, "marks": 2, "difficulty": "HARD", "text": "Differentiate between Model-Based (Dynamic Programming) and Model-Free (Q-Learning) reinforcement learning methods."},
            {"unit": 5, "marks": 10, "difficulty": "HARD", "text": "Formulate the Q-Learning algorithm. Trace Q-table updates for a grid-world agent navigating a 3x3 labyrinth with obstacles, goal reward +100, step penalty -1, and learning rate alpha = 0.5."},
            {"unit": 5, "marks": 10, "difficulty": "HARD", "text": "Evaluate the ethical implications of deploying automated Machine Learning systems in judicial bail sentencing and medical diagnosis. Detail methodologies for mitigating demographic bias and ensuring fairness."},
            {"unit": 5, "marks": 10, "difficulty": "HARD", "text": "Design an Explainable AI (XAI) framework incorporating SHAP (Shapley Additive exPlanations) and LIME to interpret deep neural network decisions for credit loan approvals."}
        ]
    }
]

AUTHENTIC_SEED_DATA = SUBJECTS_SEED_DATA[0]

def seed_database(db: Session):
    """
    Populates the database with multiple authentic engineering curricula
    and runs the NLP Bloom classifier to verify and auto-tag all questions.
    """
    seeded_subjects = []

    for seed_item in SUBJECTS_SEED_DATA:
        subj_data = seed_item["subject"]
        existing = db.query(Subject).filter(Subject.code == subj_data["code"]).first()
        if existing:
            seeded_subjects.append(existing)
            continue

        # 1. Create Subject
        subject = Subject(
            code=subj_data["code"],
            name=subj_data["name"],
            department=subj_data["department"],
            semester=subj_data["semester"],
            regulation=subj_data["regulation"]
        )
        db.add(subject)
        db.flush()

        # 2. Create Syllabus Units
        units_map = {}
        for u in seed_item["units"]:
            unit = SyllabusUnit(
                subject_id=subject.id,
                unit_number=u["unit_number"],
                title=u["title"],
                description=u["description"]
            )
            db.add(unit)
            db.flush()
            units_map[u["unit_number"]] = unit

        # 3. Create Course Outcomes
        cos_map = {}
        for co_data in seed_item["course_outcomes"]:
            co = CourseOutcome(
                subject_id=subject.id,
                code=co_data["code"],
                description=co_data["description"],
                target_bloom_level=co_data["target_bloom_level"]
            )
            db.add(co)
            db.flush()
            cos_map[co_data["code"]] = co

        # 4. Insert Questions with NLP Classification
        for q_data in seed_item["questions"]:
            u_num = q_data["unit"]
            unit_obj = units_map[u_num]
            co_code = f"CO{u_num}"
            co_obj = cos_map.get(co_code, list(cos_map.values())[0])

            nlp_result = BloomClassifierEngine.classify(q_data["text"])

            question = Question(
                subject_id=subject.id,
                unit_id=unit_obj.id,
                co_id=co_obj.id,
                question_text=q_data["text"],
                marks=q_data["marks"],
                bloom_level=nlp_result["predicted_bloom_level"],
                difficulty=q_data["difficulty"],
                action_verb=nlp_result["primary_verb"],
                confidence_score=nlp_result["confidence_score"],
                usage_count=0
            )
            db.add(question)

        db.commit()
        db.refresh(subject)
        seeded_subjects.append(subject)

    # Always seed default institutional accounts
    seed_users(db)

    return seeded_subjects


DEFAULT_USERS = [
    {
        "email": "admin@university.edu",
        "username": "admin",
        "password": "admin123",
        "full_name": "Dr. A. Sharma (Dean Academics)",
        "role": "ADMIN",
        "department": "Academic Administration"
    },
    {
        "email": "faculty@university.edu",
        "username": "faculty",
        "password": "faculty123",
        "full_name": "Prof. Rajesh Kumar",
        "role": "FACULTY",
        "department": "Computer Science & Engineering"
    },
    {
        "email": "shubh@university.edu",
        "username": "shubh",
        "password": "shubh123",
        "full_name": "Prof. Shubh V.",
        "role": "FACULTY",
        "department": "Artificial Intelligence & Data Science"
    }
]

def seed_users(db: Session):
    for u in DEFAULT_USERS:
        existing = db.query(User).filter(
            (User.email == u["email"]) | (User.username == u["username"])
        ).first()
        if not existing:
            user = User(
                email=u["email"],
                username=u["username"],
                hashed_password=hash_password(u["password"]),
                full_name=u["full_name"],
                role=u["role"],
                department=u["department"],
                is_active=1
            )
            db.add(user)
    db.commit()

