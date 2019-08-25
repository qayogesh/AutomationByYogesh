package com.yogesh.automation.practicePrograms;

public class TC17_CreatingThread_ImplementRunnable implements Runnable {

	public static void main(String[] args) {
		TC17_CreatingThread_ImplementRunnable obj = new TC17_CreatingThread_ImplementRunnable();

		Thread t1 = new Thread(obj);
		t1.start();
	}

	@Override
	public void run() {
		System.out.println("Thread is running...");
	}

}
