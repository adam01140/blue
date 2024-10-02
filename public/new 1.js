<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FormWiz - Simplify Your Paperwork</title>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&display=swap" rel="stylesheet">
    <style>
        html, body {
            height: 100%;
            margin: 0;
            display: flex;
            flex-direction: column;
            font-family: 'Montserrat', sans-serif;
            color: #333;
            background-color: #f4f4f4;
        }
        header {
            background-color: #2c3e50;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            position: relative;
        }
        header img {
            cursor: pointer;
        }
        nav {
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
            display: flex;
            gap: 15px;
        }
        nav a {
            color: #ffffff;
            text-decoration: none;
            font-weight: bold;
            transition: color 0.3s ease;
        }
        nav a:hover {
            color: #2980b9;
        }
       
	   section {
            padding: 50px;
            text-align: center;
            flex: 1;
            display: grid;
            gap: 20px;
        }
		
        section .btn {
            background-color: #2980b9;
            color: #ffffff;
            padding: 5px 30px;
            text-decoration: none;
            font-weight: bold;
            border-radius: 5px;
            transition: background-color 0.3s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: fit-content;
            margin: 0 auto;
        }
        section .btn:hover {
            background-color: #1c598a;
        }
		
        .steps {
            display: grid;
            grid-template-columns: repeat(3, minmax(150px, 1fr));
            justify-items: center;
            gap: 10px;
            max-width: 800px; /* Adjust the max-width to bring them closer */
            margin: 0 auto; /* Center the steps container */
        }
        .step {
            text-align: center;
        }
		
        footer {
            text-align: center;
            padding: 20px;
            background-color: #2c3e50;
            color: white;
        }
        /* Media query for smaller screens */
        @media (max-width: 768px) {
            header {
                flex-direction: column;
                padding: 10px;
            }
            nav {
                position: static;
                transform: none;
                margin-top: 10px;
            }
            .steps {
                grid-template-columns: 1fr;
                max-width: 100%; /* Full width on smaller screens */
            }
        }
		
		button {
    background-color: #2980b9;
    color: #ffffff;
    padding: 5px 30px;
    text-decoration: none;
    font-weight: bold;
    border-radius: 5px;
    transition: background-color 0.3s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: fit-content;
    margin: 0 auto;
}

/* Hover effect for all buttons */
button:hover {
    background-color: #1c598a;
}


    </style>
</head>
<body>

    <header>
        <img src="logo.png" alt="FormWiz Logo" width="130" height="80" onclick="location.href='index.html';">
        <nav>
            <a href="index.html">Home</a>
            <a href="forms.html">Forms</a>
            <a href="contact.html">Contact Us</a>
        </nav>
    </header>

    <center>
	<section>
        <h1><b>Welcome to FormWiz</b></h1>
		<br>
        <p><h3>FormWiz makes filling out paperwork quick and easy by automating the busy work.</p></h3>
		<br>
        <div class="steps">
            <div class="step">
                <h2>Step 1</h2>
                <p>Choose Your Form</p>
                <img src="form1.png" alt="Choose Your Form" width="100" height="120">
            </div>
            <div class="step">
                <h2>Step 2</h2>
                <p>Complete a Short Survey</p>
                <img src="form2.png" alt="Complete a Short Survey" width="110" height="140">
            </div>
            <div class="step">
                <h2>Step 3</h2>
                <p>Let FormWiz Do the Rest</p>
                <img src="form3.png" alt="Let FormWiz Do the Rest" width="150" height="120">
            </div>
        </div>

		<br>
		<button id="mybutton" href="account.html" class="btn" >Get Started</button>
		<br>
		<br>
</section>
    <footer>
        &copy; 2024 FormWiz. All rights reserved.
    </footer>

</body>
</html>
