package com.yogesh.automation.practicePrograms;

public class TC16_CreatingThread_ThreadClass extends Thread {

	public void run() {
		System.out.println("Thread is running...");
	}

	public static void main(String[] args) {

		TC16_CreatingThread_ThreadClass t1 = new TC16_CreatingThread_ThreadClass();
		t1.start();
		System.out.println("Thread id =>" + t1.currentThread().getId());
	}
}
